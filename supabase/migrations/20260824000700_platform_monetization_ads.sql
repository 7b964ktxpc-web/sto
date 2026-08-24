alter table businesses add column if not exists platform_access_status text not null default 'active' check (platform_access_status in ('active','warning','suspended','removed'));
alter table businesses add column if not exists billing_grace_days integer not null default 7 check (billing_grace_days between 0 and 60);
alter table businesses add column if not exists billing_warning_at timestamptz;
alter table businesses add column if not exists billing_suspended_at timestamptz;
alter table businesses add column if not exists billing_removed_at timestamptz;
alter table appointments add column if not exists final_amount numeric(12,2) check (final_amount is null or final_amount >= 0);

create table if not exists platform_commission_settings (
  business_id uuid primary key references businesses(id) on delete cascade,
  commission_percent numeric(5,2) not null default 10 check (commission_percent >= 0 and commission_percent <= 100),
  effective_from timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists platform_commission_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  appointment_id uuid not null unique references appointments(id) on delete cascade,
  base_amount numeric(12,2) not null check (base_amount >= 0),
  commission_percent numeric(5,2) not null check (commission_percent >= 0 and commission_percent <= 100),
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  status text not null default 'accrued' check (status in ('accrued','invoiced','paid','void')),
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists platform_commission_ledger_business_idx on platform_commission_ledger(business_id,period_start,period_end);

create table if not exists platform_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  adjustments numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0 check (total >= 0),
  currency char(3) not null default 'RUB',
  status text not null default 'draft' check (status in ('draft','issued','paid','overdue','void')),
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  payment_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, period_start, period_end)
);
create index if not exists platform_invoices_business_status_idx on platform_invoices(business_id,status);

create table if not exists platform_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references platform_invoices(id) on delete cascade,
  commission_ledger_id uuid references platform_commission_ledger(id),
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_amount numeric(12,2) not null check (unit_amount >= 0),
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists platform_ads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete set null,
  title text not null,
  placement text not null check (placement in ('HOME_TOP','HOME_LIST','MAP_PIN','SEARCH_SPONSORED','BUSINESS_PROFILE')),
  status text not null default 'draft' check (status in ('draft','active','paused','finished')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  budget numeric(12,2) not null default 0 check (budget >= 0),
  price_model text not null default 'FIXED' check (price_model in ('FIXED','CPC','CPM','PERIOD')),
  price numeric(12,2) not null default 0 check (price >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  creative jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists platform_ads_active_idx on platform_ads(placement,status,starts_at,ends_at);

create or replace function public.accrue_platform_commission_for_appointment(p_appointment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment appointments;
  v_price numeric(12,2);
  v_percent numeric(5,2);
  v_ledger_id uuid;
  v_period_start date;
  v_period_end date;
begin
  select * into v_appointment from appointments where id = p_appointment_id;
  if not found or v_appointment.status <> 'COMPLETED' then return null; end if;
  select coalesce(v_appointment.final_amount, bs.price) into v_price from business_services bs where bs.id = v_appointment.business_service_id;
  select coalesce(commission_percent,10) into v_percent from platform_commission_settings where business_id = v_appointment.business_id;
  v_period_start := date_trunc('month',coalesce(v_appointment.starts_at,now()))::date;
  v_period_end := (date_trunc('month',coalesce(v_appointment.starts_at,now())) + interval '1 month - 1 day')::date;
  insert into platform_commission_ledger(business_id,appointment_id,base_amount,commission_percent,commission_amount,status,period_start,period_end)
  values(v_appointment.business_id,v_appointment.id,v_price,v_percent,round(v_price*v_percent/100,2),'accrued',v_period_start,v_period_end)
  on conflict (appointment_id) do nothing
  returning id into v_ledger_id;
  return v_ledger_id;
end;
$$;

grant execute on function public.accrue_platform_commission_for_appointment(uuid) to service_role;

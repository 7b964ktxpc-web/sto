create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists btree_gist;

create type user_role as enum ('CLIENT','BUSINESS_OWNER','BUSINESS_MANAGER','MODERATOR','SUPPORT','FINANCE','ADMIN','SUPER_ADMIN');
create type business_status as enum ('pending','active','suspended','rejected');
create type business_mode as enum ('APPOINTMENT','QUEUE','MIXED');
create type appointment_status as enum ('PENDING','CONFIRMED','ARRIVED','IN_SERVICE','READY','COMPLETED','CANCELLED','NO_SHOW');
create type queue_status as enum ('WAITING','CALLED','IN_SERVICE','READY','COMPLETED','CANCELLED','NO_SHOW');
create type resource_type as enum ('EMPLOYEE','WORKSTATION');
create type notification_channel as enum ('WEB','TELEGRAM','EMAIL','SMS');
create type notification_type as enum ('BOOKING_CREATED','BOOKING_CONFIRMED','BOOKING_CHANGED','BOOKING_CANCELLED','REMINDER_24H','REMINDER_1H','QUEUE_UPDATED','QUEUE_APPROACHING','CAR_READY','REVIEW_REQUEST');

create table cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Asia/Novosibirsk',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  avatar_url text,
  status text not null default 'active' check (status in ('active','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  name user_role not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table businesses (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities(id),
  owner_user_id uuid references users(id),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  cover_url text,
  phone text,
  website_url text,
  status business_status not null default 'pending',
  mode business_mode not null default 'MIXED',
  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  reviews_count integer not null default 0 check (reviews_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table business_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  address text not null,
  district text,
  lat double precision not null,
  lng double precision not null,
  point geography(point,4326) generated always as (st_setsrid(st_makepoint(lng,lat),4326)::geography) stored,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);
create index business_locations_point_gix on business_locations using gist(point);

create table car_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table car_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references car_brands(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  brand_id uuid references car_brands(id),
  model_id uuid references car_models(id),
  year integer check (year between 1900 and 2100),
  vin text,
  plate_number text,
  mileage integer check (mileage >= 0),
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index cars_user_id_idx on cars(user_id);

create table service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references service_categories(id),
  name text not null,
  slug text not null unique,
  description text,
  seo_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table business_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  service_id uuid not null references services(id),
  price numeric(12,2) not null check (price >= 0),
  min_price numeric(12,2) check (min_price is null or min_price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  required_employee boolean not null default false,
  required_workstation boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, service_id)
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  position text,
  specializations text[] not null default '{}',
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workstations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  workstation_type text,
  status text not null default 'available' check (status in ('available','maintenance','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table working_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  break_starts_at time,
  break_ends_at time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((break_starts_at is null and break_ends_at is null) or (break_starts_at < break_ends_at and break_starts_at >= starts_at and break_ends_at <= ends_at)),
  unique (business_id, weekday)
);

create table working_exceptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  exception_date date not null,
  is_closed boolean not null default true,
  starts_at time,
  ends_at time,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, exception_date),
  check (is_closed or (starts_at is not null and ends_at is not null and ends_at > starts_at))
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  user_id uuid not null references users(id),
  car_id uuid not null references cars(id),
  business_service_id uuid not null references business_services(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'PENDING',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index appointments_business_time_idx on appointments(business_id, starts_at);
create index appointments_user_time_idx on appointments(user_id, starts_at);

create table appointment_resources (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  resource_type resource_type not null,
  resource_id uuid not null,
  reserved_range tstzrange not null,
  created_at timestamptz not null default now()
);
create index appointment_resources_appointment_idx on appointment_resources(appointment_id);
create index appointment_resources_resource_idx on appointment_resources(resource_type, resource_id);
create index appointment_resources_range_gist on appointment_resources using gist(reserved_range);

alter table appointment_resources add constraint appointment_resources_no_overlap
  exclude using gist (resource_type with =, resource_id with =, reserved_range with &&)
  where (resource_id is not null);

create table appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  actor_user_id uuid references users(id),
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table queues (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  queue_date date not null,
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, queue_date)
);

create table queue_entries (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references queues(id) on delete cascade,
  user_id uuid not null references users(id),
  car_id uuid not null references cars(id),
  appointment_id uuid references appointments(id),
  position integer not null check (position > 0),
  status queue_status not null default 'WAITING',
  estimated_wait_minutes integer not null default 0 check (estimated_wait_minutes >= 0),
  called_at timestamptz,
  service_started_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index queue_entries_active_position_idx on queue_entries(queue_id, position) where status in ('WAITING','CALLED','IN_SERVICE','READY');

create table reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references users(id),
  appointment_id uuid unique references appointments(id),
  rating smallint not null check (rating between 1 and 5),
  body text not null,
  status text not null default 'published' check (status in ('pending','published','hidden','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  reporter_user_id uuid not null references users(id),
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_id, reporter_user_id)
);

create table favorites (
  user_id uuid not null references users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create table telegram_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  telegram_user_id bigint not null unique,
  username text,
  chat_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  notification_type notification_type not null,
  channel notification_channel not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, notification_type, channel)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  notification_type notification_type not null,
  channel notification_channel not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  plan_key text not null,
  status text not null default 'active' check (status in ('trialing','active','past_due','cancelled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id),
  user_id uuid references users(id),
  provider text not null,
  provider_payment_id text,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'RUB',
  status text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  payment_id uuid references payments(id),
  number text not null unique,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'issued',
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id),
  business_id uuid references businesses(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  before_data jsonb,
  after_data jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index audit_logs_created_at_idx on audit_logs(created_at desc);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- Apply updated_at automatically to mutable tables.
do $$
declare t text;
begin
  foreach t in array array['cities','users','roles','permissions','role_permissions','user_roles','businesses','business_members','business_locations','car_brands','car_models','cars','service_categories','services','business_services','employees','workstations','working_hours','working_exceptions','appointments','appointment_events','appointment_resources','queues','queue_entries','reviews','review_reports','favorites','telegram_accounts','notification_preferences','notifications','subscriptions','payments','invoices','audit_logs'] loop
    execute format('drop trigger if exists set_updated_at on %I; create trigger set_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

create or replace function public.has_permission(p_permission text, p_business_id uuid default null)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from user_roles ur
    join roles r on r.id = ur.role_id
    join role_permissions rp on rp.role_id = r.id
    join permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and p.key = p_permission
      and (
        r.name in ('ADMIN','SUPER_ADMIN','MODERATOR','SUPPORT','FINANCE')
        or p_business_id is null
        or exists (select 1 from business_members bm where bm.business_id = p_business_id and bm.user_id = auth.uid())
      )
  );
$$;

alter table businesses enable row level security;
alter table business_locations enable row level security;
alter table business_services enable row level security;
alter table employees enable row level security;
alter table workstations enable row level security;
alter table appointments enable row level security;
alter table queue_entries enable row level security;
alter table reviews enable row level security;
alter table cars enable row level security;
alter table favorites enable row level security;
alter table notifications enable row level security;

create policy businesses_public_read on businesses for select using (status = 'active' and deleted_at is null);
create policy business_members_read_own on business_members for select using (user_id = auth.uid() or has_permission('business.members.read', business_id));
create policy business_locations_public_read on business_locations for select using (exists (select 1 from businesses b where b.id = business_id and b.status = 'active'));
create policy business_services_public_read on business_services for select using (exists (select 1 from businesses b where b.id = business_id and b.status = 'active'));
create policy employees_business_read on employees for select using (has_permission('employee.read', business_id) or exists (select 1 from businesses b where b.id = business_id and b.status = 'active'));
create policy workstations_business_read on workstations for select using (has_permission('workstation.read', business_id) or exists (select 1 from businesses b where b.id = business_id and b.status = 'active'));
create policy cars_owner_read on cars for select using (user_id = auth.uid());
create policy cars_owner_write on cars for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy appointments_client_read on appointments for select using (user_id = auth.uid() or has_permission('appointment.read', business_id));
create policy queue_client_read on queue_entries for select using (user_id = auth.uid() or has_permission('queue.read', (select q.business_id from queues q where q.id = queue_id)));
create policy reviews_public_read on reviews for select using (status = 'published' or user_id = auth.uid() or has_permission('review.moderate', business_id));
create policy reviews_client_insert on reviews for insert with check (user_id = auth.uid());
create policy favorites_owner_all on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_owner_all on notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into cities (name, slug, timezone) values ('Новосибирск','novosibirsk','Asia/Novosibirsk') on conflict (slug) do nothing;

insert into roles (name, description) values
('CLIENT','Клиент marketplace'),
('BUSINESS_OWNER','Владелец СТО'),
('BUSINESS_MANAGER','Менеджер СТО'),
('MODERATOR','Модерация'),
('SUPPORT','Поддержка'),
('FINANCE','Финансы'),
('ADMIN','Администратор'),
('SUPER_ADMIN','Полный доступ')
on conflict (name) do nothing;

insert into permissions (key, description) values
('business.read','Просмотр СТО'),('business.manage','Управление СТО'),('business.members.read','Управление участниками'),('service.read','Просмотр услуг'),('service.manage','Управление услугами'),('employee.read','Просмотр сотрудников'),('employee.manage','Управление сотрудниками'),('workstation.read','Просмотр постов'),('workstation.manage','Управление постами'),('appointment.read','Просмотр записей'),('appointment.manage','Управление записями'),('queue.read','Просмотр очереди'),('queue.manage','Управление очередью'),('review.moderate','Модерация отзывов'),('finance.manage','Финансовое управление'),('admin.manage','Администрирование')
on conflict (key) do nothing;

-- Safe baseline role grants. Business roles are intentionally limited.
insert into role_permissions(role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.name = 'BUSINESS_OWNER' and p.key in ('business.read','business.manage','business.members.read','service.read','service.manage','employee.read','employee.manage','workstation.read','workstation.manage','appointment.read','appointment.manage','queue.read','queue.manage')
on conflict do nothing;
insert into role_permissions(role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.name = 'BUSINESS_MANAGER' and p.key in ('business.read','service.read','service.manage','employee.read','workstation.read','appointment.read','appointment.manage','queue.read','queue.manage')
on conflict do nothing;
insert into role_permissions(role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.name = 'SUPER_ADMIN'
on conflict do nothing;

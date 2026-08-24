create or replace function public.get_available_slots(
  p_business_id uuid,
  p_business_service_id uuid,
  p_date date,
  p_slot_step_minutes integer default 30
)
returns table(
  slot_start timestamptz,
  slot_end timestamptz,
  available_workstations integer
)
language sql
stable
security definer
set search_path = public
as $$
with svc as (
  select bs.business_id, bs.duration_minutes
  from business_services bs
  join businesses b on b.id = bs.business_id
  where bs.id = p_business_service_id
    and bs.business_id = p_business_id
    and bs.is_active
    and b.status = 'active'
    and b.deleted_at is null
),
biz as (
  select b.id, c.timezone
  from businesses b
  join cities c on c.id = b.city_id
  where b.id = p_business_id
    and b.status = 'active'
    and b.deleted_at is null
),
schedule as (
  select
    coalesce(ex.starts_at, wh.starts_at) as starts_at,
    coalesce(ex.ends_at, wh.ends_at) as ends_at,
    coalesce(ex.is_closed, false) as is_closed,
    svc.duration_minutes,
    biz.timezone
  from svc
  join biz on biz.id = svc.business_id
  left join working_hours wh
    on wh.business_id = p_business_id
   and wh.weekday = extract(dow from p_date)::int
  left join working_exceptions ex
    on ex.business_id = p_business_id
   and ex.exception_date = p_date
),
bounds as (
  select
    ((p_date::timestamp + starts_at) at time zone timezone) as open_at,
    ((p_date::timestamp + ends_at) at time zone timezone) as close_at,
    duration_minutes,
    is_closed
  from schedule
  where not is_closed
    and starts_at is not null
    and ends_at is not null
),
candidates as (
  select
    gs as start_at,
    gs + make_interval(mins => b.duration_minutes) as end_at
  from bounds b
  cross join lateral generate_series(
    b.open_at,
    b.close_at - make_interval(mins => b.duration_minutes),
    make_interval(mins => greatest(coalesce(p_slot_step_minutes, 30), 5))
  ) gs
),
resources as (
  select ws.id
  from workstations ws
  where ws.business_id = p_business_id
    and ws.is_active = true
    and upper(ws.status) = 'AVAILABLE'
),
free_counts as (
  select
    c.start_at,
    c.end_at,
    count(r.id) filter (where not exists (
      select 1
      from appointments a
      where a.business_id = p_business_id
        and a.workstation_id = r.id
        and a.status not in ('CANCELLED'::appointment_status, 'NO_SHOW'::appointment_status)
        and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(c.start_at, c.end_at, '[)')
    ))::integer as free_count
  from candidates c
  cross join resources r
  group by c.start_at, c.end_at
)
select start_at, end_at, free_count
from free_counts
where free_count > 0
order by start_at;
$$;

grant execute on function public.get_available_slots(uuid, uuid, date, integer) to anon, authenticated;

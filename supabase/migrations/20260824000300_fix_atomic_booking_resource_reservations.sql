create or replace function public.create_appointment_atomic(
  p_business_id uuid,
  p_user_id uuid,
  p_car_id uuid,
  p_business_service_id uuid,
  p_starts_at timestamptz,
  p_employee_id uuid default null,
  p_workstation_id uuid default null,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment_id uuid;
  v_duration integer;
  v_ends_at timestamptz;
  v_city_timezone text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_weekday smallint;
  v_hours working_hours%rowtype;
  v_exception working_exceptions%rowtype;
  v_required_employee boolean;
  v_required_workstation boolean;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'FORBIDDEN'; end if;
  select bs.duration_minutes, bs.required_employee, bs.required_workstation
    into v_duration, v_required_employee, v_required_workstation
  from business_services bs
  join businesses b on b.id = bs.business_id
  where bs.id = p_business_service_id and bs.business_id = p_business_id and bs.is_active and b.status = 'active';
  if not found then raise exception 'SERVICE_NOT_AVAILABLE'; end if;
  if v_required_employee and p_employee_id is null then raise exception 'EMPLOYEE_REQUIRED'; end if;
  if v_required_workstation and p_workstation_id is null then raise exception 'WORKSTATION_REQUIRED'; end if;
  select c.timezone into v_city_timezone from businesses b join cities c on c.id=b.city_id where b.id=p_business_id;
  if v_city_timezone is null then raise exception 'BUSINESS_NOT_FOUND'; end if;
  v_ends_at := p_starts_at + make_interval(mins=>v_duration);
  v_local_start := p_starts_at at time zone v_city_timezone;
  v_local_end := v_ends_at at time zone v_city_timezone;
  v_weekday := extract(dow from v_local_start)::smallint;
  select * into v_exception from working_exceptions where business_id=p_business_id and exception_date=v_local_start::date;
  if found and v_exception.is_closed then raise exception 'BUSINESS_CLOSED'; end if;
  if found then
    if v_local_start::time < v_exception.starts_at or v_local_end::time > v_exception.ends_at then raise exception 'OUTSIDE_WORKING_HOURS'; end if;
  else
    select * into v_hours from working_hours where business_id=p_business_id and weekday=v_weekday;
    if not found then raise exception 'BUSINESS_CLOSED'; end if;
    if v_local_start::time < v_hours.starts_at or v_local_end::time > v_hours.ends_at then raise exception 'OUTSIDE_WORKING_HOURS'; end if;
    if v_hours.break_starts_at is not null and v_local_start::time < v_hours.break_ends_at and v_local_end::time > v_hours.break_starts_at then raise exception 'BREAK_CONFLICT'; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':' || v_local_start::date::text,0));
  if not exists(select 1 from cars where id=p_car_id and user_id=p_user_id) then raise exception 'CAR_NOT_FOUND'; end if;
  if p_employee_id is not null and not exists(select 1 from employees where id=p_employee_id and business_id=p_business_id and status='active') then raise exception 'INVALID_EMPLOYEE'; end if;
  if p_workstation_id is not null and not exists(select 1 from workstations where id=p_workstation_id and business_id=p_business_id and status='AVAILABLE') then raise exception 'INVALID_WORKSTATION'; end if;
  insert into appointments(business_id,user_id,car_id,business_service_id,employee_id,workstation_id,starts_at,ends_at,status,notes)
  values(p_business_id,p_user_id,p_car_id,p_business_service_id,p_employee_id,p_workstation_id,p_starts_at,v_ends_at,'CONFIRMED',p_notes)
  returning id into v_appointment_id;
  insert into appointment_events(appointment_id,actor_user_id,event_type,payload)
  values(v_appointment_id,p_user_id,'BOOKING_CREATED',jsonb_build_object('source','marketplace_atomic'));
  return v_appointment_id;
exception when exclusion_violation then raise exception 'SLOT_ALREADY_TAKEN';
end;
$$;

grant execute on function public.create_appointment_atomic(uuid,uuid,uuid,uuid,timestamptz,uuid,uuid,text) to authenticated;

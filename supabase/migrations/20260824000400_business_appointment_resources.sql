create or replace function public.business_update_appointment(
  p_appointment_id uuid,
  p_actor_user_id uuid,
  p_starts_at timestamptz default null,
  p_status appointment_status default null,
  p_workstation_id uuid default null,
  p_employee_id uuid default null,
  p_notes text default null
) returns appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app appointments;
  v_member_role app_role;
  v_duration integer;
  v_end timestamptz;
  v_workstation uuid;
  v_employee uuid;
begin
  select bm.role into v_member_role
  from business_members bm
  where bm.user_id = p_actor_user_id
    and bm.business_id = (select business_id from appointments where id = p_appointment_id)
    and bm.role in ('BUSINESS_OWNER','BUSINESS_MANAGER')
  limit 1;
  if v_member_role is null then raise exception 'BUSINESS_ACCESS_REQUIRED'; end if;

  select * into v_app from appointments where id = p_appointment_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;

  v_workstation := coalesce(p_workstation_id, v_app.workstation_id);
  v_employee := coalesce(p_employee_id, v_app.employee_id);

  if v_workstation is not null and not exists (
    select 1 from workstations
    where id=v_workstation and business_id=v_app.business_id and is_active and status <> 'OFFLINE'
  ) then raise exception 'INVALID_WORKSTATION'; end if;

  if v_employee is not null and not exists (
    select 1 from employees
    where id=v_employee and business_id=v_app.business_id and is_active
  ) then raise exception 'INVALID_EMPLOYEE'; end if;

  if p_starts_at is not null then
    select duration_minutes into v_duration from business_services where id=v_app.business_service_id;
    if v_duration is null then raise exception 'SERVICE_NOT_FOUND'; end if;
    v_end := p_starts_at + make_interval(mins => v_duration);
    perform pg_advisory_xact_lock(hashtextextended(v_app.business_id::text || ':' || p_starts_at::text, 0));
    update appointments
      set starts_at=p_starts_at, ends_at=v_end,
          workstation_id=v_workstation, employee_id=v_employee,
          notes=coalesce(p_notes, notes), updated_at=now()
      where id=p_appointment_id;
  else
    update appointments
      set workstation_id=v_workstation, employee_id=v_employee,
          notes=coalesce(p_notes, notes), updated_at=now()
      where id=p_appointment_id;
  end if;

  if p_status is not null then
    update appointments set status=p_status, updated_at=now() where id=p_appointment_id;
  end if;

  select * into v_app from appointments where id=p_appointment_id;
  insert into appointment_events(appointment_id,actor_user_id,event_type,payload)
  values(v_app.id,p_actor_user_id,'BUSINESS_APPOINTMENT_UPDATED',jsonb_build_object(
    'status',v_app.status,'starts_at',v_app.starts_at,'ends_at',v_app.ends_at,
    'workstation_id',v_app.workstation_id,'employee_id',v_app.employee_id
  ));
  return v_app;
exception when exclusion_violation then
  raise exception 'SLOT_ALREADY_TAKEN';
end;
$$;

grant execute on function public.business_update_appointment(uuid,uuid,timestamptz,appointment_status,uuid,uuid,text) to service_role;

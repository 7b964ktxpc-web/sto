import { NextResponse } from 'next/server';
import { getBusinessMembership, canManageBusiness } from '@/server/auth/business';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET(request: Request) {
  const membership = await getBusinessMembership();
  if (!membership) return NextResponse.json({ error: 'BUSINESS_ACCESS_REQUIRED' }, { status: 403 });
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  let query = getAdminClient().from('appointments').select(`
    id,starts_at,ends_at,status,user_id,car_id,business_service_id,workstation_id,notes,
    user:users(id,display_name,phone,email),
    car:cars(id,brand,model,year,plate_number,mileage),
    service:business_services(id,price,duration_minutes,service:services(id,name)),
    workstation:workstations(id,name,status)
  `).eq('business_id', membership.businessId).order('starts_at');
  if (from) query = query.gte('starts_at', new Date(from).toISOString());
  if (to) query = query.lt('starts_at', new Date(to).toISOString());
  const { data, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: 'APPOINTMENTS_LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ appointments: data ?? [] });
}

export async function PATCH(request: Request) {
  const membership = await getBusinessMembership();
  if (!membership || !canManageBusiness(membership.role)) return NextResponse.json({ error: 'BUSINESS_WRITE_REQUIRED' }, { status: 403 });
  try {
    const body = await request.json();
    const appointmentId = String(body.id ?? '');
    const startsAt = body.starts_at ? String(body.starts_at) : null;
    const status = body.status ? String(body.status) : null;
    const workstationId = body.workstation_id ? String(body.workstation_id) : null;
    if (!appointmentId || (!startsAt && !status && !workstationId)) return NextResponse.json({ error: 'APPOINTMENT_UPDATE_REQUIRED' }, { status: 400 });
    const { data, error } = await getAdminClient().rpc('business_update_appointment', {
      p_appointment_id: appointmentId,
      p_starts_at: startsAt,
      p_status: status,
      p_workstation_id: workstationId,
      p_notes: body.notes ? String(body.notes).slice(0, 1000) : null,
    });
    if (error) {
      const message = error.message.includes('SLOT_ALREADY_TAKEN') || error.code === '23P01' ? 'Это время уже заняли. Выберите другой слот.' : error.message.includes('APPOINTMENT_NOT_FOUND') ? 'Запись не найдена.' : 'Не удалось изменить запись.';
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ appointment: data });
  } catch {
    return NextResponse.json({ error: 'INVALID_APPOINTMENT_UPDATE' }, { status: 400 });
  }
}

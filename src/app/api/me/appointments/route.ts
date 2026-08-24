import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { data, error } = await getAdminClient().from('appointments').select('id,business_id,car_id,starts_at,ends_at,status,notes,business:businesses(id,name,slug),service:business_services(id,price,duration_minutes,service:services(id,name)),car:cars(id,brand,model,plate_number)').eq('user_id', user.id).order('starts_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'APPOINTMENTS_LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ appointments: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const body = await request.json();
    const businessServiceId = String(body.business_service_id ?? '');
    const carId = String(body.car_id ?? '');
    const start = String(body.starts_at ?? '');
    const workstationId = body.workstation_id ? String(body.workstation_id) : null;
    const employeeId = body.employee_id ? String(body.employee_id) : null;
    if (!businessServiceId || !carId || !start) return NextResponse.json({ error: 'BOOKING_FIELDS_REQUIRED' }, { status: 400 });
    const db = getAdminClient();
    const { data: car } = await db.from('cars').select('id').eq('id', carId).eq('user_id', user.id).maybeSingle();
    if (!car) return NextResponse.json({ error: 'CAR_NOT_FOUND' }, { status: 400 });
    const { data, error } = await db.rpc('book_appointment', {
      p_business_service_id: businessServiceId,
      p_user_id: user.id,
      p_car_id: carId,
      p_start: start,
      p_workstation_id: workstationId,
      p_employee_id: employeeId,
      p_notes: body.notes ? String(body.notes).slice(0, 1000) : null,
    });
    if (error) {
      const message = error.message.includes('SLOT_ALREADY_TAKEN') ? 'Это время уже заняли. Выберите другой свободный слот.' : error.message.includes('OUTSIDE_WORKING_HOURS') ? 'Это время вне рабочего графика.' : 'Не удалось создать запись.';
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ appointment: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'INVALID_BOOKING_REQUEST' }, { status: 400 });
  }
}

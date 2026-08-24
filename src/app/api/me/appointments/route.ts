import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';
import { sendTelegramToUser } from '@/server/notifications/telegram';

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
    const employeeId = body.employee_id ? String(body.employee_id) : null;
    if (!businessServiceId || !carId || !start) return NextResponse.json({ error: 'BOOKING_FIELDS_REQUIRED' }, { status: 400 });

    const db = getAdminClient();
    const [{ data: car }, { data: service }] = await Promise.all([
      db.from('cars').select('id,brand,model').eq('id', carId).eq('user_id', user.id).maybeSingle(),
      db.from('business_services').select('business_id,duration_minutes,price,service_id').eq('id', businessServiceId).eq('is_active', true).maybeSingle(),
    ]);
    if (!car) return NextResponse.json({ error: 'CAR_NOT_FOUND' }, { status: 400 });
    if (!service) return NextResponse.json({ error: 'SERVICE_NOT_FOUND' }, { status: 400 });

    const [{ data: catalogService }, { data: business }] = await Promise.all([
      db.from('services').select('name').eq('id', service.service_id).maybeSingle(),
      db.from('businesses').select('name').eq('id', service.business_id).maybeSingle(),
    ]);

    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return NextResponse.json({ error: 'INVALID_START_TIME' }, { status: 400 });
    const endDate = new Date(startDate.getTime() + Number(service.duration_minutes) * 60_000);
    const { data: workstations } = await db.from('workstations').select('id').eq('business_id', service.business_id).eq('is_active', true).eq('status', 'AVAILABLE').order('name');
    if (!workstations?.length) return NextResponse.json({ error: 'NO_AVAILABLE_WORKSTATIONS' }, { status: 409 });
    const { data: occupied } = await db.from('appointments').select('workstation_id').eq('business_id', service.business_id).lt('starts_at', endDate.toISOString()).gt('ends_at', startDate.toISOString()).not('status', 'in', '(CANCELLED,NO_SHOW)').not('workstation_id', 'is', null);
    const occupiedIds = new Set((occupied ?? []).map((x) => x.workstation_id));
    const workstationId = workstations.find((w) => !occupiedIds.has(w.id))?.id;
    if (!workstationId) return NextResponse.json({ error: 'SLOT_ALREADY_TAKEN' }, { status: 409 });

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
      const message = error.message.includes('SLOT_ALREADY_TAKEN') || error.code === '23P01' ? 'Это время уже заняли. Выберите другой свободный слот.' : error.message.includes('OUTSIDE_WORKING_HOURS') ? 'Это время вне рабочего графика.' : 'Не удалось создать запись.';
      return NextResponse.json({ error: message }, { status: 409 });
    }

    void sendTelegramToUser(user.id, `🚗 STO NSK\nЗапись создана.\n${business?.name ?? 'СТО'}\n${catalogService?.name ?? 'Услуга'}\n${car.brand} ${car.model}\n${new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Novosibirsk', dateStyle: 'medium', timeStyle: 'short' }).format(startDate)}`);

    return NextResponse.json({ appointment: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'INVALID_BOOKING_REQUEST' }, { status: 400 });
  }
}

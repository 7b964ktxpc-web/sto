import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient, isAdminConfigured } from '@/server/supabase/admin';
import { validateTelegramInitData } from '@/lib/telegram';

function mapBookingError(message: string) {
  if (message.includes('SLOT_ALREADY_TAKEN')) return { error: 'SLOT_TAKEN', status: 409 };
  if (message.includes('OUTSIDE_WORKING_HOURS')) return { error: 'OUTSIDE_WORKING_HOURS', status: 400 };
  if (message.includes('BUSINESS_CLOSED')) return { error: 'BUSINESS_CLOSED', status: 400 };
  if (message.includes('BREAK_CONFLICT')) return { error: 'BREAK_CONFLICT', status: 400 };
  if (message.includes('CAR_NOT_FOUND')) return { error: 'CAR_NOT_FOUND', status: 400 };
  if (message.includes('SERVICE_NOT_AVAILABLE')) return { error: 'SERVICE_NOT_AVAILABLE', status: 400 };
  if (message.includes('INVALID_WORKSTATION')) return { error: 'INVALID_WORKSTATION', status: 400 };
  if (message.includes('INVALID_EMPLOYEE')) return { error: 'INVALID_EMPLOYEE', status: 400 };
  return { error: 'BOOKING_FAILED', status: 400 };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const user = await getCurrentUser();
    if (!isAdminConfigured()) return NextResponse.json({ error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 });

    const db = getAdminClient();

    // Web marketplace booking uses the app session. Telegram keeps its existing flow.
    if (user) {
      const businessId = String(body.businessId ?? '');
      const carId = String(body.carId ?? '');
      const businessServiceId = String(body.businessServiceId ?? '');
      const startsAt = String(body.startsAt ?? '');
      if (!businessId || !carId || !businessServiceId || !startsAt) {
        return NextResponse.json({ error: 'INVALID_BOOKING_DATA' }, { status: 400 });
      }

      const { data, error } = await db.rpc('create_appointment_atomic_session', {
        p_user_id: user.id,
        p_business_id: businessId,
        p_car_id: carId,
        p_business_service_id: businessServiceId,
        p_starts_at: startsAt,
        p_employee_id: body.employeeId || null,
        p_workstation_id: body.workstationId || null,
        p_notes: body.notes || null,
      });

      if (error) {
        const mapped = mapBookingError(error.message);
        return NextResponse.json({ error: mapped.error }, { status: mapped.status });
      }
      return NextResponse.json({ appointmentId: data, authenticated: true }, { status: 201 });
    }

    const initData = String(body.initData ?? '');
    const tg = validateTelegramInitData(initData);
    const { data, error } = await db.rpc('create_booking_by_telegram', {
      p_telegram_id: tg.id,
      p_station_id: body.stationId,
      p_service_id: body.serviceId,
      p_starts_at: body.startsAt,
      p_name: body.name,
      p_phone: body.phone,
      p_car: body.car ?? null,
      p_comment: body.comment ?? null,
    });
    if (error) {
      const code = error.message.includes('SLOT_TAKEN') ? 'SLOT_TAKEN' : error.message;
      return NextResponse.json({ error: code }, { status: code === 'SLOT_TAKEN' ? 409 : 400 });
    }
    return NextResponse.json({ booking: data, authenticated: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'BOOKING_FAILED';
    const mapped = mapBookingError(message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const startsAt = String(body.starts_at ?? '');
    if (!id || !startsAt || Number.isNaN(new Date(startsAt).getTime())) {
      return NextResponse.json({ error: 'INVALID_RESCHEDULE_REQUEST' }, { status: 400 });
    }
    const { data, error } = await getAdminClient().rpc('reschedule_appointment_for_user', {
      p_appointment_id: id,
      p_user_id: user.id,
      p_starts_at: startsAt,
      p_workstation_id: body.workstation_id ? String(body.workstation_id) : null,
    });
    if (error) {
      const message = error.message.includes('SLOT_TAKEN') ? 'Это время уже заняли. Выберите другой свободный слот.'
        : error.message.includes('RESCHEDULE_NOT_ALLOWED') ? 'Эту запись уже нельзя перенести.'
        : error.message.includes('OUTSIDE_WORKING_HOURS') ? 'Это время вне рабочего графика.'
        : error.message.includes('BREAK_CONFLICT') ? 'Выбранное время попадает на технический перерыв.'
        : error.message.includes('BUSINESS_CLOSED') ? 'СТО закрыто в выбранную дату.'
        : error.message.includes('APPOINTMENT_NOT_FOUND') ? 'Запись не найдена.'
        : 'Не удалось перенести запись.';
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ appointment: data });
  } catch {
    return NextResponse.json({ error: 'INVALID_RESCHEDULE_REQUEST' }, { status: 400 });
  }
}

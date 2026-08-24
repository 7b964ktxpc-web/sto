import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';
import { sendTelegramToUser } from '@/server/notifications/telegram';

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
    const db = getAdminClient();
    const { data, error } = await db.rpc('reschedule_appointment_for_user', {
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

    const { data: context } = await db.from('appointments').select('business:businesses(name),service:business_services(service:services(name)),car:cars(brand,model)').eq('id', id).eq('user_id', user.id).maybeSingle();
    const businessName = (context?.business as { name?: string } | null)?.name ?? 'СТО';
    const serviceName = ((context?.service as { service?: { name?: string } } | null)?.service?.name) ?? 'Услуга';
    const car = context?.car as { brand?: string; model?: string } | null;
    const localStart = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Novosibirsk', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(startsAt));
    void db.from('notifications').insert({ user_id: user.id, type: 'BOOKING_RESCHEDULED', title: 'Запись перенесена', body: `${businessName} · ${serviceName} · ${localStart}`, payload: { appointment_id: id, business_name: businessName } });
    void sendTelegramToUser(user.id, `🚗 STO NSK\nЗапись перенесена.\n${businessName}\n${serviceName}\n${car?.brand ?? ''} ${car?.model ?? ''}\n${localStart}`.replace(/\n /g, '\n'));

    return NextResponse.json({ appointment: data });
  } catch {
    return NextResponse.json({ error: 'INVALID_RESCHEDULE_REQUEST' }, { status: 400 });
  }
}

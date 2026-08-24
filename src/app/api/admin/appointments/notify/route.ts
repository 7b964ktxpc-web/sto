import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

export async function POST(request: Request) {
  const auth = await requirePlatformRole(['ADMIN', 'SUPER_ADMIN', 'MODERATOR']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  try {
    const body = await request.json();
    const id = String(body.id ?? '').trim();
    const title = String(body.title ?? 'Сообщение от STO NSK').trim();
    const message = String(body.message ?? '').trim();
    if (!id || !message) return NextResponse.json({ error: 'ID_AND_MESSAGE_REQUIRED' }, { status: 400 });
    if (message.length > 1000) return NextResponse.json({ error: 'MESSAGE_TOO_LONG' }, { status: 400 });
    const db = getAdminClient();
    const { data: appointment, error } = await db.from('appointments').select('id,business_id,user_id').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!appointment) return NextResponse.json({ error: 'APPOINTMENT_NOT_FOUND' }, { status: 404 });
    await db.from('notifications').insert([
      { user_id: appointment.user_id, notification_type: 'BOOKING_CHANGED', channel: 'WEB', title, body: message, payload: { appointment_id: id, manual: true } },
      { user_id: appointment.user_id, notification_type: 'BOOKING_CHANGED', channel: 'TELEGRAM', title, body: message, payload: { appointment_id: id, manual: true } },
    ]);
    await db.from('appointment_events').insert({ appointment_id: id, actor_user_id: auth.user.id, event_type: 'appointment.notification_sent', payload: { title, message } });
    await db.from('audit_logs').insert({ actor_user_id: auth.user.id, business_id: appointment.business_id, action: 'appointment.notification_sent', entity_type: 'appointment', entity_id: id, reason: 'Manual client notification', metadata: { title, message } });
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('admin appointment notify', error);
    return NextResponse.json({ error: 'Не удалось отправить уведомление' }, { status: 503 });
  }
}

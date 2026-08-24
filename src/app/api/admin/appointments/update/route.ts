import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

const STATUS = new Set(['PENDING','CONFIRMED','ARRIVED','IN_SERVICE','READY','COMPLETED','CANCELLED','NO_SHOW']);

export async function PATCH(request: Request) {
  const auth = await requirePlatformRole(['ADMIN', 'SUPER_ADMIN', 'MODERATOR']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  try {
    const body = await request.json();
    const id = String(body.id ?? '').trim();
    if (!id) return NextResponse.json({ error: 'APPOINTMENT_ID_REQUIRED' }, { status: 400 });
    if (body.status && !STATUS.has(String(body.status))) return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 });
    const db = getAdminClient();
    const before = await db.from('appointments').select('id,business_id,user_id,starts_at,ends_at,status,notes').eq('id', id).maybeSingle();
    if (before.error) throw before.error;
    if (!before.data) return NextResponse.json({ error: 'APPOINTMENT_NOT_FOUND' }, { status: 404 });
    const patch: Record<string, unknown> = {};
    if (body.status) patch.status = body.status;
    if (body.starts_at) patch.starts_at = body.starts_at;
    if (body.ends_at) patch.ends_at = body.ends_at;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'NO_CHANGES' }, { status: 400 });
    const updated = await db.from('appointments').update(patch).eq('id', id).select('id,business_id,user_id,starts_at,ends_at,status,notes').single();
    if (updated.error) throw updated.error;
    const action = patch.status === 'CANCELLED' ? 'appointment.cancelled' : (patch.starts_at ? 'appointment.rescheduled' : 'appointment.updated');
    await db.from('appointment_events').insert({ appointment_id: id, actor_user_id: auth.user.id, event_type: action, payload: { patch } });
    await db.from('audit_logs').insert({ actor_user_id: auth.user.id, business_id: before.data.business_id, action, entity_type: 'appointment', entity_id: id, reason: 'Admin appointment update', metadata: { before: before.data, after: updated.data, patch } });
    const notificationType = patch.status === 'CANCELLED' ? 'BOOKING_CANCELLED' : (patch.starts_at ? 'BOOKING_CHANGED' : null);
    if (notificationType) {
      await db.from('notifications').insert({ user_id: before.data.user_id, notification_type: notificationType, channel: 'WEB', title: notificationType === 'BOOKING_CANCELLED' ? 'Запись отменена' : 'Запись изменена', body: notificationType === 'BOOKING_CANCELLED' ? 'Администратор отменил вашу запись.' : 'Администратор изменил детали вашей записи.', payload: { appointment_id: id } });
      await db.from('notifications').insert({ user_id: before.data.user_id, notification_type: notificationType, channel: 'TELEGRAM', title: notificationType === 'BOOKING_CANCELLED' ? 'Запись отменена' : 'Запись изменена', body: notificationType === 'BOOKING_CANCELLED' ? 'Администратор отменил вашу запись.' : 'Администратор изменил детали вашей записи.', payload: { appointment_id: id } });
    }
    return NextResponse.json({ appointment: updated.data, notified: Boolean(notificationType) });
  } catch (error) {
    console.error('admin appointment update', error);
    return NextResponse.json({ error: 'Не удалось изменить запись' }, { status: 503 });
  }
}

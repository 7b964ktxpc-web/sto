import { NextResponse } from 'next/server';
import { getBusinessMembership, canManageBusiness } from '@/server/auth/business';
import { getAdminClient } from '@/server/supabase/admin';
import { sendTelegramToUser } from '@/server/notifications/telegram';

export async function GET() {
  const membership = await getBusinessMembership();
  if (!membership) return NextResponse.json({ error: 'BUSINESS_ACCESS_REQUIRED' }, { status: 403 });
  const { data, error } = await getAdminClient()
    .from('queues')
    .select('id,is_open,mode,queue_entries(id,user_id,car_id,status,position,estimated_wait_minutes,created_at,car:cars(id,brand,model,plate_number),user:users(id,display_name,phone))')
    .eq('business_id', membership.businessId)
    .single();
  if (error) return NextResponse.json({ error: 'QUEUE_LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ queue: data });
}

export async function PATCH(request: Request) {
  const membership = await getBusinessMembership();
  if (!membership || !canManageBusiness(membership.role)) return NextResponse.json({ error: 'BUSINESS_WRITE_REQUIRED' }, { status: 403 });
  try {
    const body = await request.json();
    const entryId = String(body.entry_id ?? '');
    const status = String(body.status ?? '');
    const position = body.position == null ? null : Number(body.position);
    const allowed = ['WAITING', 'CALLED', 'IN_SERVICE', 'READY', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!entryId || !allowed.includes(status)) return NextResponse.json({ error: 'QUEUE_UPDATE_REQUIRED' }, { status: 400 });
    if (position !== null && (!Number.isInteger(position) || position < 1)) return NextResponse.json({ error: 'INVALID_QUEUE_POSITION' }, { status: 400 });

    const db = getAdminClient();
    const { data: before } = await db
      .from('queue_entries')
      .select('id,user_id,position,estimated_wait_minutes,car_id,status,business_id')
      .eq('id', entryId)
      .eq('business_id', membership.businessId)
      .maybeSingle();
    if (!before) return NextResponse.json({ error: 'QUEUE_ENTRY_NOT_FOUND' }, { status: 404 });

    const { data, error } = await db.rpc('business_update_queue_entry', {
      p_entry_id: entryId,
      p_status: status,
      p_position: position,
    });
    if (error) {
      const message = error.message.includes('BUSINESS_ACCESS_REQUIRED')
        ? 'BUSINESS_ACCESS_REQUIRED'
        : error.message.includes('INVALID_STATUS_TRANSITION')
          ? 'Этот переход статуса недоступен.'
          : 'Не удалось изменить статус очереди.';
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const resolvedPosition = Number(data?.position ?? position ?? before.position);
    if (before.user_id) {
      if (status === 'CALLED') {
        void sendTelegramToUser(before.user_id, '🚗 Ваша очередь приближается\nВас вызывают на обслуживание.');
      } else if (status === 'READY') {
        void sendTelegramToUser(before.user_id, '✅ Автомобиль готов\nМожно забирать автомобиль из СТО.');
      } else if (status === 'WAITING' && resolvedPosition <= 1) {
        void sendTelegramToUser(before.user_id, '🚗 Вы следующий\nПеред вами остался 1 автомобиль или меньше.');
      }
    }

    return NextResponse.json({ entry: data });
  } catch {
    return NextResponse.json({ error: 'INVALID_QUEUE_UPDATE' }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';
import { sendTelegramToUser } from '@/server/notifications/telegram';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { id } = await params;
  const db = getAdminClient();
  const { data, error } = await db.rpc('cancel_appointment', { p_appointment_id: id, p_user_id: user.id });
  if (error) {
    const message = error.message.includes('NOT_ALLOWED') ? 'BOOKING_CANNOT_BE_CANCELLED' : 'BOOKING_CANCEL_FAILED';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { data: context } = await db.from('appointments').select('business:businesses(name),service:business_services(service:services(name)),starts_at,car:cars(brand,model)').eq('id', id).eq('user_id', user.id).maybeSingle();
  const businessName = (context?.business as { name?: string } | null)?.name ?? 'СТО';
  const serviceName = ((context?.service as { service?: { name?: string } } | null)?.service?.name) ?? 'Услуга';
  const localStart = context?.starts_at ? new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Novosibirsk', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(context.starts_at)) : '';
  void db.from('notifications').insert({ user_id: user.id, type: 'BOOKING_CANCELLED', title: 'Запись отменена', body: `${businessName} · ${serviceName}${localStart ? ` · ${localStart}` : ''}`, payload: { appointment_id: id, business_name: businessName } });
  void sendTelegramToUser(user.id, `🚗 STO NSK\nЗапись отменена.\n${businessName}\n${serviceName}${localStart ? `\n${localStart}` : ''}`);

  return NextResponse.json({ appointment: data });
}

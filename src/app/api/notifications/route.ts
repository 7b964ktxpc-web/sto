import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { data, error } = await getAdminClient().from('notifications').select('id,type,title,body,read_at,created_at,payload').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'NOTIFICATIONS_LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const body = await request.json();
  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'NOTIFICATION_ID_REQUIRED' }, { status: 400 });
  const { data, error } = await getAdminClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select('id,read_at').single();
  if (error) return NextResponse.json({ error: 'NOTIFICATION_UPDATE_FAILED' }, { status: 400 });
  return NextResponse.json({ notification: data });
}

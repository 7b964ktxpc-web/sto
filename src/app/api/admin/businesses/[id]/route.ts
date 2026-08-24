import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformRole(['ADMIN','SUPER_ADMIN']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  try {
    const { id } = await params;
    const body = await req.json();
    const allowed = ['active','pending','blocked','suspended'];
    if (typeof body.status !== 'string' || !allowed.includes(body.status)) {
      return NextResponse.json({ error: 'Некорректный статус' }, { status: 400 });
    }
    const db = getAdminClient();
    const { data: before } = await db.from('businesses').select('id,name,status').eq('id', id).maybeSingle();
    if (!before) return NextResponse.json({ error: 'СТО не найдено' }, { status: 404 });
    const { data, error } = await db.from('businesses').update({ status: body.status }).eq('id', id).select('id,name,status').single();
    if (error) return NextResponse.json({ error: 'Не удалось изменить статус СТО' }, { status: 400 });
    await db.from('audit_logs').insert({ actor_user_id: auth.user.id, action: 'BUSINESS_STATUS_CHANGED', entity_type: 'business', entity_id: id, metadata: { from: before.status, to: body.status } });
    return NextResponse.json({ business: data });
  } catch {
    return NextResponse.json({ error: 'Ошибка администратора' }, { status: 500 });
  }
}

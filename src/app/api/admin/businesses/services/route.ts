import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

const roles = ['ADMIN', 'SUPER_ADMIN'] as const;

export async function PATCH(request: Request) {
  const auth = await requirePlatformRole([...roles]);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  try {
    const body = await request.json();
    const id = String(body.id ?? '').trim();
    if (!id) return NextResponse.json({ error: 'SERVICE_ID_REQUIRED' }, { status: 400 });
    const db = getAdminClient();
    const { data: before, error: readError } = await db.from('business_services').select('id,price,duration_minutes,is_active,business_id').eq('id', id).maybeSingle();
    if (readError) throw readError;
    if (!before) return NextResponse.json({ error: 'SERVICE_NOT_FOUND' }, { status: 404 });
    const next = { price: Number(body.price), duration_minutes: Number(body.duration_minutes), is_active: Boolean(body.is_active) };
    if (!Number.isFinite(next.price) || next.price < 0 || !Number.isFinite(next.duration_minutes) || next.duration_minutes <= 0) return NextResponse.json({ error: 'INVALID_SERVICE_DATA' }, { status: 400 });
    const { data: after, error } = await db.from('business_services').update(next).eq('id', id).select('id,price,duration_minutes,is_active,business_id').single();
    if (error) throw error;
    await db.from('audit_logs').insert({ actor_user_id: auth.user.id, business_id: before.business_id, action: 'business_service.updated', entity_type: 'business_service', entity_id: id, reason: 'Admin service update', metadata: { before, after } });
    return NextResponse.json({ service: after });
  } catch (error) {
    console.error('admin service update', error);
    return NextResponse.json({ error: 'SERVICE_UPDATE_FAILED' }, { status: 500 });
  }
}

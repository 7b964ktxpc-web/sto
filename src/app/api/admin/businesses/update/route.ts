import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

const allowedStatuses = new Set(['active','pending','blocked','suspended']);

export async function PATCH(request: Request) {
  const auth = await requirePlatformRole(['ADMIN','SUPER_ADMIN']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  try {
    const body = await request.json();
    const id = String(body.id ?? '').trim();
    if (!id) return NextResponse.json({ error: 'BUSINESS_ID_REQUIRED' }, { status: 400 });

    const patch: Record<string, unknown> = {};
    for (const key of ['name','phone','email','address','description']) {
      if (key in body) patch[key] = body[key] === null ? null : String(body[key]).trim();
    }
    if ('status' in body) {
      const status = String(body.status);
      if (!allowedStatuses.has(status)) return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 });
      patch.status = status;
    }
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'NOTHING_TO_UPDATE' }, { status: 400 });

    const db = getAdminClient();
    const { data: before, error: beforeError } = await db.from('businesses').select('id,name,phone,email,address,description,status').eq('id', id).maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) return NextResponse.json({ error: 'BUSINESS_NOT_FOUND' }, { status: 404 });

    const { data: after, error } = await db.from('businesses').update(patch).eq('id', id).select('id,name,slug,status,rating,review_count,address,phone,email,description,created_at').single();
    if (error) throw error;

    await db.from('audit_logs').insert({
      actor_user_id: auth.user.id,
      action: 'ADMIN_BUSINESS_UPDATE',
      entity_type: 'business',
      entity_id: id,
      metadata: { before, after, changed: patch },
    });

    return NextResponse.json({ business: after });
  } catch (error) {
    console.error('admin business update', error);
    return NextResponse.json({ error: 'Не удалось сохранить СТО' }, { status: 503 });
  }
}

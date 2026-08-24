import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET() {
  const auth = await requirePlatformRole(['ADMIN','SUPER_ADMIN','MODERATOR']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  const { data, error } = await getAdminClient().from('reviews').select('id,business_id,user_id,appointment_id,rating,body,is_published,created_at,updated_at').order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'REVIEWS_LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await requirePlatformRole(['ADMIN','SUPER_ADMIN','MODERATOR']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  const body = await request.json();
  const id = String(body.id ?? '');
  const isPublished = Boolean(body.is_published);
  if (!id) return NextResponse.json({ error: 'REVIEW_ID_REQUIRED' }, { status: 400 });
  const { data, error } = await getAdminClient().from('reviews').update({ is_published: isPublished }).eq('id', id).select('id,is_published').single();
  if (error) return NextResponse.json({ error: 'REVIEW_UPDATE_FAILED' }, { status: 400 });
  await getAdminClient().from('audit_logs').insert({ actor_user_id: auth.user.id, action: isPublished ? 'REVIEW_PUBLISHED' : 'REVIEW_HIDDEN', entity_type: 'review', entity_id: id, metadata: {} });
  return NextResponse.json({ review: data });
}

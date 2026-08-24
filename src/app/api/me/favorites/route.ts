import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { data, error } = await getAdminClient()
    .from('favorites')
    .select('business_id,business:businesses(id,name,slug,rating,review_count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'FAVORITES_LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ favorites: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const body = await request.json();
    const businessId = String(body.business_id ?? '');
    if (!businessId) return NextResponse.json({ error: 'BUSINESS_ID_REQUIRED' }, { status: 400 });
    const db = getAdminClient();
    const { data: business } = await db.from('businesses').select('id').eq('id', businessId).eq('status', 'active').is('deleted_at', null).maybeSingle();
    if (!business) return NextResponse.json({ error: 'BUSINESS_NOT_FOUND' }, { status: 404 });
    const { error } = await db.from('favorites').upsert({ user_id: user.id, business_id: businessId }, { onConflict: 'user_id,business_id' });
    if (error) return NextResponse.json({ error: 'FAVORITE_CREATE_FAILED' }, { status: 400 });
    return NextResponse.json({ favorite: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'INVALID_FAVORITE_REQUEST' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const businessId = new URL(request.url).searchParams.get('business_id') ?? '';
  if (!businessId) return NextResponse.json({ error: 'BUSINESS_ID_REQUIRED' }, { status: 400 });
  const { error } = await getAdminClient().from('favorites').delete().eq('user_id', user.id).eq('business_id', businessId);
  if (error) return NextResponse.json({ error: 'FAVORITE_DELETE_FAILED' }, { status: 400 });
  return NextResponse.json({ favorite: false });
}

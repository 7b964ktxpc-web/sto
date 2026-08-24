import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET(request: Request) {
  const auth = await requirePlatformRole(['ADMIN', 'SUPER_ADMIN', 'MODERATOR']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });

  const search = new URL(request.url).searchParams;
  const q = search.get('q')?.trim() ?? '';
  const status = search.get('status')?.trim() ?? '';
  const db = getAdminClient();
  let query = db
    .from('businesses')
    .select('id,name,slug,status,rating,reviews_count,phone,created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'BUSINESSES_LOAD_FAILED' }, { status: 503 });

  const items = await Promise.all((data ?? []).map(async (business) => {
    const { data: location } = await db.from('business_locations').select('address').eq('business_id', business.id).maybeSingle();
    return { ...business, address: location?.address ?? null, review_count: business.reviews_count };
  }));
  return NextResponse.json({ businesses: items });
}

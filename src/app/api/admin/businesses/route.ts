import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET(request: Request) {
  const auth = await requirePlatformRole(['ADMIN', 'SUPER_ADMIN', 'MODERATOR']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  const status = new URL(request.url).searchParams.get('status')?.trim() ?? '';
  const db = getAdminClient();
  let query = db
    .from('businesses')
    .select('id,name,slug,status,rating,review_count,phone,address,created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (q) query = query.or(`name.ilike.%${q}%,address.ilike.%${q}%,phone.ilike.%${q}%`);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'BUSINESSES_LOAD_FAILED' }, { status: 503 });
  return NextResponse.json({ businesses: data ?? [] });
}

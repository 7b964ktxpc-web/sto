import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET() {
  const auth = await requirePlatformRole(['ADMIN','SUPER_ADMIN']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  const { data, error } = await getAdminClient().from('audit_logs').select('id,actor_user_id,action,entity_type,entity_id,metadata,created_at').order('created_at',{ascending:false}).limit(200);
  if (error) return NextResponse.json({ error: 'AUDIT_LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}

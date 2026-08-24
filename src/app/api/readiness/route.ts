import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET() {
  const checks = { supabase: false, environment: false };
  checks.environment = Boolean((process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (checks.environment) {
    try {
      const { error } = await getAdminClient().from('businesses').select('id').limit(1);
      checks.supabase = !error;
    } catch { checks.supabase = false; }
  }
  const ready = checks.environment && checks.supabase;
  return NextResponse.json({ ok: ready, ready, checks, timestamp: new Date().toISOString() }, { status: ready ? 200 : 503 });
}

import { NextResponse } from 'next/server';
import { isAdminConfigured } from '@/server/supabase/admin';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'sto-nsk',
    runtime: 'netlify-nextjs',
    supabaseConfigured: isAdminConfigured(),
    timestamp: new Date().toISOString(),
  });
}

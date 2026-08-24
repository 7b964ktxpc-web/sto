import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'sto-nsk',
    runtime: 'vercel-nextjs',
    supabaseConfigured: Boolean(
      (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    timestamp: new Date().toISOString(),
  });
}

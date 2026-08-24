import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'sto-nsk',
    runtime: 'cloudflare-workers-compatible',
    timestamp: new Date().toISOString(),
  });
}

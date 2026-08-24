import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/server/supabase/admin';
import { rateLimit, requestIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const rl = rateLimit(`login:${requestIp(request)}`, 10, 5 * 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'TOO_MANY_ATTEMPTS', retry_after: Math.ceil((rl.resetAt - Date.now()) / 1000) }, { status: 429 });
  try {
    const body = await request.json();
    const identifier = String(body.identifier ?? '').trim();
    const password = String(body.password ?? '');
    if (!identifier || password.length < 8) return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return NextResponse.json({ error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 });

    const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const credentials = identifier.includes('@') ? { email: identifier, password } : { phone: identifier, password };
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error || !data.user) return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });

    const db = getAdminClient();
    await db.from('users').upsert({ id: data.user.id, email: data.user.email ?? null, phone: data.user.phone ?? null, display_name: (data.user.user_metadata?.display_name as string | undefined) ?? null }, { onConflict: 'id' });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { error: sessionError } = await db.from('sessions').insert({ user_id: data.user.id, token_hash: tokenHash, expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), user_agent: request.headers.get('user-agent'), ip: requestIp(request) });
    if (sessionError) return NextResponse.json({ error: 'LOGIN_SESSION_FAILED' }, { status: 500 });

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set('sto_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return NextResponse.json({ error: 'LOGIN_FAILED' }, { status: 400 });
  }
}

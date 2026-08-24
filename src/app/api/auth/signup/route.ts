import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';
import { rateLimit, requestIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const rl = rateLimit(`signup:${requestIp(request)}`, 5, 10 * 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'TOO_MANY_ATTEMPTS', retry_after: Math.ceil((rl.resetAt - Date.now()) / 1000) }, { status: 429 });
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim();
    const password = String(body.password ?? '');
    const displayName = String(body.display_name ?? '').trim().slice(0, 120);
    if ((!email && !phone) || password.length < 8) return NextResponse.json({ error: 'INVALID_SIGNUP_DATA' }, { status: 400 });

    const db = getAdminClient();
    const { data: created, error } = await db.auth.admin.createUser({
      email: email || undefined,
      phone: phone || undefined,
      password,
      email_confirm: Boolean(email),
      phone_confirm: Boolean(phone),
      user_metadata: { display_name: displayName || null },
    });
    if (error || !created.user) return NextResponse.json({ error: error?.message?.includes('already') ? 'USER_ALREADY_EXISTS' : 'SIGNUP_FAILED' }, { status: 400 });

    await db.from('users').insert({ id: created.user.id, display_name: displayName || null, email: email || null, phone: phone || null });
    await db.from('user_roles').insert({ user_id: created.user.id, role: 'CLIENT' });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { error: sessionError } = await db.from('sessions').insert({ user_id: created.user.id, token_hash: tokenHash, expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), user_agent: request.headers.get('user-agent'), ip: requestIp(request) });
    if (sessionError) return NextResponse.json({ error: 'SIGNUP_SESSION_FAILED' }, { status: 500 });

    const response = NextResponse.json({ authenticated: true, userId: created.user.id }, { status: 201 });
    response.cookies.set('sto_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return NextResponse.json({ error: 'SIGNUP_FAILED' }, { status: 400 });
  }
}

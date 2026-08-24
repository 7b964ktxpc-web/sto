import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { rateLimit, requestIp } from '@/lib/rate-limit';
import { getAdminClient } from '@/server/supabase/admin';

const DEFAULT_ADMIN_LOGIN = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin';
const DEFAULT_ADMIN_EMAIL = 'admin@sto-nsk.local';

export async function POST(request: Request) {
  const rl = rateLimit(`admin-login:${requestIp(request)}`, 5, 10 * 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'TOO_MANY_ATTEMPTS' }, { status: 429 });

  try {
    const body = await request.json();
    const login = String(body.login ?? '').trim();
    const password = String(body.password ?? '');

    const expectedLogin = process.env.ADMIN_LOGIN || DEFAULT_ADMIN_LOGIN;
    const expectedPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
    const adminEmail = process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;

    if (login !== expectedLogin || password !== expectedPassword) {
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    const db = getAdminClient();
    const listed = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listed.error) throw listed.error;

    let authUser = listed.data.users.find((user) => user.email === adminEmail) ?? null;

    if (!authUser) {
      const created = await db.auth.admin.createUser({
        email: adminEmail,
        password: expectedPassword,
        email_confirm: true,
        user_metadata: { display_name: 'STO NSK Admin', admin_login: expectedLogin },
      });
      if (created.error || !created.data.user) throw created.error ?? new Error('ADMIN_USER_CREATE_FAILED');
      authUser = created.data.user;
    } else if (process.env.ADMIN_PASSWORD) {
      const updated = await db.auth.admin.updateUserById(authUser.id, { password: expectedPassword });
      if (updated.error) throw updated.error;
    }

    await db.from('users').upsert({
      id: authUser.id,
      email: adminEmail,
      display_name: 'STO NSK Admin',
    }, { onConflict: 'id' });

    const { error: roleError } = await db.from('user_roles').upsert(
      { user_id: authUser.id, role: 'ADMIN' },
      { onConflict: 'user_id,role' },
    );
    if (roleError) throw roleError;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { error: sessionError } = await db.from('sessions').insert({
      user_id: authUser.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
      user_agent: request.headers.get('user-agent'),
      ip: requestIp(request),
    });
    if (sessionError) throw sessionError;

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set('sto_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (error) {
    console.error('admin login', error);
    return NextResponse.json({ error: 'ADMIN_LOGIN_FAILED' }, { status: 500 });
  }
}

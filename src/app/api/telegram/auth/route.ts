import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateTelegramInitData } from '@/lib/telegram';
import { getAdminClient } from '@/server/supabase/admin';

export async function POST(request: Request) {
  try {
    const { initData } = await request.json();
    const tg = validateTelegramInitData(String(initData ?? ''));
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 });

    const adminAuth = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const email = `tg_${tg.id}@internal.sto-nsk.local`;
    let authUser = null;
    const listed = await adminAuth.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listed.error) throw listed.error;
    authUser = listed.data.users.find((u) => u.user_metadata?.telegram_id === tg.id) ?? null;
    if (!authUser) {
      const created = await adminAuth.auth.admin.createUser({ email, email_confirm: true, user_metadata: { telegram_id: tg.id, display_name: [tg.first_name, tg.last_name].filter(Boolean).join(' ') || tg.username || 'Telegram user' } });
      if (created.error || !created.data.user) throw created.error ?? new Error('TELEGRAM_USER_CREATE_FAILED');
      authUser = created.data.user;
    }

    const db = getAdminClient();
    const displayName = [tg.first_name, tg.last_name].filter(Boolean).join(' ') || tg.username || 'Telegram user';
    await db.from('users').upsert({ id: authUser.id, email: authUser.email ?? email, display_name: displayName }, { onConflict: 'id' });
    await db.from('user_roles').upsert({ user_id: authUser.id, role: 'CLIENT' }, { onConflict: 'user_id,role' });
    const { error: telegramError } = await db.from('telegram_accounts').upsert({ user_id: authUser.id, telegram_user_id: tg.id, username: tg.username ?? null }, { onConflict: 'user_id' });
    if (telegramError) throw telegramError;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await db.from('sessions').insert({ user_id: authUser.id, token_hash: tokenHash, expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), user_agent: request.headers.get('user-agent'), ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null });

    const response = NextResponse.json({ ok: true, user_id: authUser.id });
    response.cookies.set('sto_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AUTH_FAILED';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

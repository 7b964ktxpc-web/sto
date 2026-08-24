import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';
import { validateTelegramInitData } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const { initData } = await request.json();
    if (typeof initData !== 'string' || initData.length > 8000) return NextResponse.json({ error: 'INVALID_INIT_DATA' }, { status: 400 });
    const telegramUser = validateTelegramInitData(initData);
    const db = getAdminClient();

    const telegramId = String(telegramUser.id);
    const { data: linked } = await db.from('telegram_accounts').select('user_id').eq('telegram_user_id', telegramUser.id).maybeSingle();
    let userId = linked?.user_id as string | undefined;

    if (!userId) {
      const syntheticEmail = `telegram_${telegramId}@users.sto-nsk.local`;
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email: syntheticEmail,
        password: crypto.randomBytes(32).toString('hex'),
        email_confirm: true,
        user_metadata: { display_name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') || telegramUser.username || 'Telegram user' },
      });
      if (createError || !created.user) return NextResponse.json({ error: 'TELEGRAM_USER_CREATE_FAILED' }, { status: 500 });
      userId = created.user.id;
      await db.from('users').insert({ id: userId, display_name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') || telegramUser.username || 'Telegram user' });
      await db.from('user_roles').insert({ user_id: userId, role: 'CLIENT' });
      await db.from('telegram_accounts').insert({ user_id: userId, telegram_user_id: telegramUser.id, username: telegramUser.username ?? null });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await db.from('sessions').insert({ user_id: userId, token_hash: tokenHash, expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), user_agent: 'Telegram Mini App' });

    const response = NextResponse.json({ authenticated: true, userId });
    response.cookies.set('sto_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return NextResponse.json({ error: 'INVALID_INIT_DATA' }, { status: 401 });
  }
}

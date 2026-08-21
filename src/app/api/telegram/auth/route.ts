import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateTelegramInitData } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const { initData } = await request.json();
    const tg = validateTelegramInitData(String(initData ?? ''));
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 });
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const email = `tg_${tg.id}@internal.na-post.local`;
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let authUser = users.users.find((u) => u.user_metadata?.telegram_id === tg.id);
    if (!authUser) {
      const created = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { telegram_id: tg.id } });
      if (created.error) throw created.error;
      authUser = created.data.user;
    }
    const { error } = await admin.from('profiles').upsert({ id: authUser.id, telegram_id: tg.id, full_name: [tg.first_name, tg.last_name].filter(Boolean).join(' ') || tg.username || 'Telegram user' }, { onConflict: 'id' });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AUTH_FAILED';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

import { NextResponse } from 'next/server';
import { rateLimit, requestIp } from '@/lib/rate-limit';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET(request: Request) {
  const rl = rateLimit(`telegram-setup:${requestIp(request)}`, 3, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: 'TOO_MANY_REQUESTS' }, { status: 429 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });

  const db = getAdminClient();
  const { data: roleRows, error: roleError } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['ADMIN', 'SUPER_ADMIN']);
  if (roleError) return NextResponse.json({ ok: false, error: 'ROLE_CHECK_FAILED' }, { status: 503 });
  if (!roleRows?.length) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  if (!token) return NextResponse.json({ ok: false, error: 'TELEGRAM_NOT_CONFIGURED' }, { status: 503 });

  const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`;
  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message'],
      ...(process.env.TELEGRAM_WEBHOOK_SECRET ? { secret_token: process.env.TELEGRAM_WEBHOOK_SECRET } : {}),
    }),
  });
  const webhookResult = await response.json().catch(() => null);
  if (!response.ok || !webhookResult?.ok) {
    return NextResponse.json({ ok: false, error: 'TELEGRAM_WEBHOOK_SETUP_FAILED' }, { status: 502 });
  }

  const commandsResponse = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start', description: 'Открыть STO NSK' },
        { command: 'menu', description: 'Открыть меню STO NSK' },
        { command: 'appointments', description: 'Мои последние записи' },
      ],
    }),
  });
  const commandsResult = await commandsResponse.json().catch(() => null);

  return NextResponse.json({ ok: true, webhookUrl, webhook: webhookResult, commands: commandsResult });
}

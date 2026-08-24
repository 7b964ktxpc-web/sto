import { NextResponse } from 'next/server';
import { rateLimit, requestIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const rl = rateLimit(`telegram-setup:${requestIp(request)}`, 3, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: 'TOO_MANY_REQUESTS' }, { status: 429 });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  if (!token) return NextResponse.json({ ok: false, error: 'TELEGRAM_NOT_CONFIGURED' }, { status: 503 });

  const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`;
  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] }),
  });
  const webhookResult = await response.json().catch(() => null);
  if (!response.ok || !webhookResult?.ok) {
    return NextResponse.json({ ok: false, error: 'TELEGRAM_WEBHOOK_SETUP_FAILED', webhookResult }, { status: 502 });
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

  return NextResponse.json({
    ok: true,
    webhookUrl,
    webhook: webhookResult,
    commands: commandsResult,
  });
}

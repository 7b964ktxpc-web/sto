import { getAdminClient } from '@/server/supabase/admin';

export async function sendTelegramToUser(userId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { sent: false, reason: 'TELEGRAM_NOT_CONFIGURED' as const };
  const db = getAdminClient();
  const { data } = await db.from('telegram_accounts').select('telegram_user_id').eq('user_id', userId).maybeSingle();
  if (!data?.telegram_user_id) return { sent: false, reason: 'TELEGRAM_ACCOUNT_NOT_LINKED' as const };

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: data.telegram_user_id, text, disable_web_page_preview: true }),
  });
  if (!response.ok) return { sent: false, reason: 'TELEGRAM_SEND_FAILED' as const };
  return { sent: true as const };
}

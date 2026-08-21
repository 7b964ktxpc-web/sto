import crypto from 'node:crypto';

const MAX_AGE_SECONDS = 24 * 60 * 60;

export function validateTelegramInitData(initData: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('Invalid initData');
  params.delete('hash');
  const pairs = [...params.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`);
  const dataCheckString = pairs.join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hash, 'hex'))) throw new Error('Invalid initData signature');
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || Math.floor(Date.now()/1000) - authDate > MAX_AGE_SECONDS) throw new Error('Expired initData');
  const userRaw = params.get('user');
  if (!userRaw) throw new Error('Telegram user is missing');
  return JSON.parse(userRaw) as { id:number; first_name?:string; last_name?:string; username?:string };
}

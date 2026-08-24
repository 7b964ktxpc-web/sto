import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/server/supabase/admin';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sto_session')?.value;
  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await getAdminClient().from('sessions').delete().eq('token_hash', tokenHash);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set('sto_session', '', { httpOnly: true, expires: new Date(0), secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  return response;
}

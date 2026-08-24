import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sto_session')?.value;
  if (token) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await getAdminClient().from('sessions').delete().eq('token_hash', hash);
  }
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set('sto_session', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}

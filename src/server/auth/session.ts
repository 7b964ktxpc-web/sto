import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/server/supabase/admin';

export type CurrentUser = { id: string; display_name: string | null; phone: string | null; email: string | null };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('sto_session')?.value;
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const db = getAdminClient();
  const { data, error } = await db.rpc('get_current_user_by_session', { p_token_hash: tokenHash });
  if (error || !data?.length) return null;
  return { id: data[0].user_id, display_name: data[0].display_name, phone: data[0].phone, email: data[0].email };
}

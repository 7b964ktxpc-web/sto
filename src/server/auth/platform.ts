import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

export async function requirePlatformRole(allowed: string[] = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR']) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await getAdminClient().from('user_roles').select('role').eq('user_id', user.id);
  const roles = (data ?? []).map((row) => row.role as string);
  if (!roles.some((role) => allowed.includes(role))) return null;
  return { user, roles };
}

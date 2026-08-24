import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

export const BUSINESS_WRITE_ROLES = ['BUSINESS_OWNER', 'BUSINESS_MANAGER'] as const;

export async function getBusinessMembership() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await getAdminClient().from('business_members').select('business_id,role').eq('user_id', user.id).limit(1).maybeSingle();
  if (error || !data) return null;
  return { user, businessId: data.business_id as string, role: data.role as string };
}

export function canManageBusiness(role: string) {
  return (BUSINESS_WRITE_ROLES as readonly string[]).includes(role);
}

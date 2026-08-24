import { createClient } from '@supabase/supabase-js';

function readServerEnv(name: string) {
  return process.env[name];
}

export function isAdminConfigured() {
  const url = readServerEnv('SUPABASE_URL') ?? readServerEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = readServerEnv('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(url && key);
}

export function getAdminClient() {
  const url = readServerEnv('SUPABASE_URL') ?? readServerEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = readServerEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_NOT_CONFIGURED');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

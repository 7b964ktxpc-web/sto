import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { data, error } = await getAdminClient().from('appointments').select('id,business_id,car_id,starts_at,ends_at,status,notes,business:businesses(id,name,slug),service:business_services(id,price,duration_minutes,service:services(id,name)),car:cars(id,brand,model,plate_number)').eq('user_id', user.id).order('starts_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'APPOINTMENTS_LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ appointments: data ?? [] });
}

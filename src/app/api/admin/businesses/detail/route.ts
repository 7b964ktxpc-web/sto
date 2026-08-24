import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET(request: Request) {
  const auth = await requirePlatformRole(['ADMIN', 'SUPER_ADMIN', 'MODERATOR']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'BUSINESS_ID_REQUIRED' }, { status: 400 });
  try {
    const db = getAdminClient();
    const { data: business, error: businessError } = await db.from('businesses').select('id,name,slug,status,rating,review_count,phone,description,owner_user_id,created_at').eq('id', id).maybeSingle();
    if (businessError) throw businessError;
    if (!business) return NextResponse.json({ error: 'BUSINESS_NOT_FOUND' }, { status: 404 });
    const [location, owner, services, employees, workstations, appointments] = await Promise.all([
      db.from('business_locations').select('address').eq('business_id', id).maybeSingle(),
      business.owner_user_id ? db.from('users').select('email,display_name,phone').eq('id', business.owner_user_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      db.from('business_services').select('id,price,duration_minutes,is_active,service:services(name,slug)').eq('business_id', id).order('created_at', { ascending: false }).limit(100),
      db.from('employees').select('id,name,position,is_active').eq('business_id', id).order('name', { ascending: true }).limit(100),
      db.from('workstations').select('id,name,status,is_active').eq('business_id', id).order('name', { ascending: true }).limit(100),
      db.from('appointments').select('id,starts_at,ends_at,status,user:users(display_name,phone),service:business_services(service:services(name))').eq('business_id', id).order('starts_at', { ascending: false }).limit(25),
    ]);
    if (location.error) throw location.error;
    if (owner.error) throw owner.error;
    if (services.error) throw services.error;
    if (employees.error) throw employees.error;
    if (workstations.error) throw workstations.error;
    if (appointments.error) throw appointments.error;
    return NextResponse.json({ business: { ...business, address: location.data?.address ?? null, email: owner.data?.email ?? null, owner_name: owner.data?.display_name ?? null }, services: services.data ?? [], employees: employees.data ?? [], workstations: workstations.data ?? [], appointments: appointments.data ?? [] });
  } catch (error) {
    console.error('admin business detail', error);
    return NextResponse.json({ error: 'Не удалось загрузить СТО' }, { status: 503 });
  }
}

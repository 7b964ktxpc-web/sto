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
    const [business, services, employees, workstations, appointments] = await Promise.all([
      db.from('businesses').select('id,name,slug,status,rating,review_count,address,phone,email,description,created_at').eq('id', id).maybeSingle(),
      db.from('business_services').select('id,price,duration_minutes,is_active,service:services(name,slug)').eq('business_id', id).order('created_at', { ascending: false }).limit(100),
      db.from('business_employees').select('id,name,position,is_active').eq('business_id', id).order('name', { ascending: true }).limit(100),
      db.from('workstations').select('id,name,status').eq('business_id', id).order('name', { ascending: true }).limit(100),
      db.from('appointments').select('id,starts_at,ends_at,status,user:users(display_name,phone),service:business_services(service:services(name))').eq('business_id', id).order('starts_at', { ascending: false }).limit(25),
    ]);

    if (business.error) throw business.error;
    return NextResponse.json({
      business: business.data,
      services: services.data ?? [],
      employees: employees.data ?? [],
      workstations: workstations.data ?? [],
      appointments: appointments.data ?? [],
    });
  } catch (error) {
    console.error('admin business detail', error);
    return NextResponse.json({ error: 'Не удалось загрузить СТО' }, { status: 503 });
  }
}

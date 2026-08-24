import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET(request: Request) {
  const auth = await requirePlatformRole(['ADMIN', 'SUPER_ADMIN', 'MODERATOR']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'APPOINTMENT_ID_REQUIRED' }, { status: 400 });
  const db = getAdminClient();
  try {
    const { data, error } = await db.from('appointments').select(`id,business_id,user_id,car_id,business_service_id,starts_at,ends_at,status,notes,created_at,updated_at,user:users(full_name,phone,email),car:cars(plate_number,year,comments,brand:car_brands(name),model:car_models(name)),service:business_services(price,duration_minutes,service:services(name)),business:businesses(name,slug),resources:appointment_resources(resource_type,resource_id)`).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'APPOINTMENT_NOT_FOUND' }, { status: 404 });
    const appointment = {
      ...data,
      user: data.user ? { ...data.user, display_name: data.user.full_name } : null,
    };
    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('admin appointment detail', error);
    return NextResponse.json({ error: 'Не удалось загрузить запись' }, { status: 503 });
  }
}

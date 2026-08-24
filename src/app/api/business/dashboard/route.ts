import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET() {
  try {
    const db = getAdminClient();
    const { data: business } = await db.from('businesses').select('id,name,rating').eq('status','active').order('created_at').limit(1).single();
    if (!business) return NextResponse.json({ error: 'BUSINESS_NOT_FOUND' }, { status: 404 });
    const start = new Date(); start.setHours(0,0,0,0); const end = new Date(start); end.setDate(end.getDate()+1);
    const [{ data: appointments }, { data: workstations }, { data: services }, { data: queue }] = await Promise.all([
      db.from('appointments').select('id,starts_at,ends_at,status,car_id,business_service_id,user_id,workstation_id').eq('business_id',business.id).gte('starts_at',start.toISOString()).lt('starts_at',end.toISOString()).order('starts_at'),
      db.from('workstations').select('id,name,status').eq('business_id',business.id).eq('is_active',true).order('name'),
      db.from('business_services').select('id,price,duration_minutes,is_active,service:services(name)').eq('business_id',business.id).eq('is_active',true).order('created_at'),
      db.from('queues').select('id,is_open,mode,queue_entries(id,status,position,estimated_wait_minutes)').eq('business_id',business.id).single()
    ]);
    return NextResponse.json({ business, appointments: appointments ?? [], workstations: workstations ?? [], services: services ?? [], queue: queue ?? null });
  } catch (error) {
    console.error('GET /api/business/dashboard', error);
    return NextResponse.json({ error: 'Не удалось загрузить dashboard' }, { status: 503 });
  }
}

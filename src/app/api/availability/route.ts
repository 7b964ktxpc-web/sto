import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const businessServiceId = searchParams.get('businessServiceId');
    const date = searchParams.get('date');
    if (!businessId || !businessServiceId || !date) return NextResponse.json({ error: 'businessId, businessServiceId and date are required' }, { status: 400 });
    const db = getAdminClient();
    const { data, error } = await db.rpc('get_available_slots', { p_business_id: businessId, p_business_service_id: businessServiceId, p_date: date, p_slot_step_minutes: 30 });
    if (error) throw error;
    return NextResponse.json({ slots: data ?? [] });
  } catch (error) {
    console.error('GET /api/availability', error);
    return NextResponse.json({ error: 'Не удалось получить свободные слоты' }, { status: 503 });
  }
}

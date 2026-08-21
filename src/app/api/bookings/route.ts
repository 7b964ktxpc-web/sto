import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateTelegramInitData } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tg = validateTelegramInitData(String(body.initData ?? ''));
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 });
    const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await db.rpc('create_booking_by_telegram', {
      p_telegram_id: tg.id,
      p_station_id: body.stationId,
      p_service_id: body.serviceId,
      p_starts_at: body.startsAt,
      p_name: body.name,
      p_phone: body.phone,
      p_car: body.car ?? null,
      p_comment: body.comment ?? null,
    });
    if (error) {
      const code = error.message.includes('SLOT_TAKEN') ? 'SLOT_TAKEN' : error.message;
      return NextResponse.json({ error: code }, { status: code === 'SLOT_TAKEN' ? 409 : 400 });
    }
    return NextResponse.json({ booking: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'BOOKING_FAILED';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

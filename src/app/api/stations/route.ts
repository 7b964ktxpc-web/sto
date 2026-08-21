import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 });
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service');
  let query = db.from('stations').select('id,name,address,lat,lng,rating,phone,photos,status,tz,station_services(id,service_id,price,duration_minutes,is_active,services(id,name,category))').eq('status','active');
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const stations = (data ?? []).filter((station: any) => !service || station.station_services?.some((x: any) => x.services?.id === service || x.services?.name?.toLowerCase().includes(service.toLowerCase())));
  return NextResponse.json({ stations });
}

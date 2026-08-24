import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 });

  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service');
  const query = searchParams.get('q')?.trim().toLowerCase();

  const { data, error } = await db
    .from('businesses')
    .select('id,name,phone,rating,description,business_locations(id,address,location),business_services(id,service_id,price,duration_minutes,services(id,name))')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('rating', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stations = (data ?? []).map((station: any) => {
    const location = station.business_locations?.[0]?.location;
    // PostGIS geography is returned as GeoJSON by Supabase when configured accordingly;
    // keep a safe fallback for seeded/demo data.
    const coords = Array.isArray(location?.coordinates) ? location.coordinates : [82.93, 55.03];
    return {
      ...station,
      address: station.business_locations?.[0]?.address ?? 'Новосибирск',
      lat: Number(coords[1]),
      lng: Number(coords[0]),
      station_services: station.business_services ?? [],
    };
  }).filter((station: any) => {
    const matchesQuery = !query || station.name.toLowerCase().includes(query) || station.address.toLowerCase().includes(query) || station.station_services.some((x: any) => x.services?.name?.toLowerCase().includes(query));
    const matchesService = !service || station.station_services.some((x: any) => x.service_id === service || x.services?.name?.toLowerCase().includes(service.toLowerCase()));
    return matchesQuery && matchesService;
  });

  return NextResponse.json({ stations });
}

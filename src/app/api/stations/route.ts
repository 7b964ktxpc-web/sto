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

  const { data: businesses, error } = await db.from('business_search').select('*').order('rating', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (businesses ?? []).map((b: any) => b.id);
  let servicesQuery = db.from('business_services').select('id,business_id,service_id,price,duration_minutes,services(id,name)').in('business_id', ids).eq('is_active', true);
  const { data: businessServices, error: serviceError } = await servicesQuery;
  if (serviceError) return NextResponse.json({ error: serviceError.message }, { status: 500 });

  const serviceByBusiness = new Map<string, any[]>();
  for (const item of businessServices ?? []) serviceByBusiness.set(item.business_id, [...(serviceByBusiness.get(item.business_id) ?? []), item]);

  const stations = (businesses ?? []).map((station: any) => ({
    ...station,
    station_services: serviceByBusiness.get(station.id) ?? [],
  })).filter((station: any) => {
    const matchesQuery = !query || station.name.toLowerCase().includes(query) || station.address.toLowerCase().includes(query) || station.station_services.some((x: any) => x.services?.name?.toLowerCase().includes(query));
    const matchesService = !service || station.station_services.some((x: any) => x.service_id === service || x.services?.name?.toLowerCase().includes(service.toLowerCase()));
    return matchesQuery && matchesService;
  });

  return NextResponse.json({ stations });
}

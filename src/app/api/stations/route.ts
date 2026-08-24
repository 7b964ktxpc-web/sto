import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 });

  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service')?.trim().toLowerCase();
  const query = searchParams.get('q')?.trim().toLowerCase();

  const { data: businesses, error } = await db
    .from('businesses')
    .select('id,name,slug,phone,rating,review_count,description,logo_url,photos')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('rating', { ascending: false });

  if (error) {
    console.error('stations businesses query', error);
    return NextResponse.json({ error: 'STATIONS_LOAD_FAILED' }, { status: 500 });
  }

  const ids = (businesses ?? []).map((business) => business.id);
  if (!ids.length) return NextResponse.json({ stations: [] });

  const [locationsResult, servicesResult] = await Promise.all([
    db.from('business_locations').select('business_id,address,location,is_primary').in('business_id', ids).eq('is_primary', true),
    db.from('business_services').select('id,business_id,service_id,price,min_price,duration_minutes,is_active').in('business_id', ids).eq('is_active', true),
  ]);

  if (locationsResult.error) {
    console.error('stations locations query', locationsResult.error);
    return NextResponse.json({ error: 'STATIONS_LOCATION_LOAD_FAILED' }, { status: 500 });
  }
  if (servicesResult.error) {
    console.error('stations services query', servicesResult.error);
    return NextResponse.json({ error: 'STATIONS_SERVICES_LOAD_FAILED' }, { status: 500 });
  }

  const serviceIds = [...new Set((servicesResult.data ?? []).map((item) => item.service_id))];
  const { data: services, error: serviceCatalogError } = serviceIds.length
    ? await db.from('services').select('id,name,slug,description,is_active').in('id', serviceIds).eq('is_active', true)
    : { data: [], error: null };

  if (serviceCatalogError) {
    console.error('stations service catalog query', serviceCatalogError);
    return NextResponse.json({ error: 'STATIONS_SERVICE_CATALOG_LOAD_FAILED' }, { status: 500 });
  }

  const locationByBusiness = new Map<string, { address: string | null; location: unknown }>();
  for (const location of locationsResult.data ?? []) locationByBusiness.set(location.business_id, location);

  const serviceById = new Map<string, (typeof services)[number]>();
  for (const item of services ?? []) serviceById.set(item.id, item);

  const serviceByBusiness = new Map<string, Array<Record<string, unknown>>>();
  for (const item of servicesResult.data ?? []) {
    const catalog = serviceById.get(item.service_id);
    if (!catalog) continue;
    const list = serviceByBusiness.get(item.business_id) ?? [];
    list.push({ ...item, service: catalog });
    serviceByBusiness.set(item.business_id, list);
  }

  const stations = (businesses ?? [])
    .map((business) => {
      const location = locationByBusiness.get(business.id);
      const stationServices = serviceByBusiness.get(business.id) ?? [];
      const point = parsePoint(location?.location);
      return {
        ...business,
        address: location?.address ?? '',
        lat: point?.lat ?? 0,
        lng: point?.lng ?? 0,
        station_services: stationServices,
      };
    })
    .filter((station) => {
      const matchesQuery =
        !query ||
        station.name.toLowerCase().includes(query) ||
        station.address.toLowerCase().includes(query) ||
        station.station_services.some((item) => String(item.service && typeof item.service === 'object' && 'name' in item.service ? item.service.name : '').toLowerCase().includes(query));
      const matchesService =
        !service ||
        station.station_services.some((item) =>
          item.service_id === service ||
          String(item.service && typeof item.service === 'object' && 'name' in item.service ? item.service.name : '').toLowerCase().includes(service),
        );
      return matchesQuery && matchesService;
    });

  return NextResponse.json({ stations });
}

function parsePoint(value: unknown): { lat: number; lng: number } | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null) {
    const candidate = value as { coordinates?: unknown };
    if (Array.isArray(candidate.coordinates) && candidate.coordinates.length >= 2) {
      const lng = Number(candidate.coordinates[0]);
      const lat = Number(candidate.coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }
  const text = String(value);
  const match = text.match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/i);
  if (!match) return null;
  const lng = Number(match[1]);
  const lat = Number(match[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lng, lat } : null;
}

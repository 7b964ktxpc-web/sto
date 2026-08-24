import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const service = searchParams.get('service')?.trim();
    const district = searchParams.get('district')?.trim();
    const minRating = Number(searchParams.get('minRating') ?? 0);

    const db = getAdminClient();
    let query = db.from('businesses').select(`
      id,name,slug,description,logo_url,cover_url,rating,reviews_count,mode,
      city:cities(id,name,slug),
      location:business_locations(address,district,lat,lng),
      services:business_services(id,price,min_price,duration_minutes,service:services(id,name,slug))
    `).eq('status', 'active').is('deleted_at', null).gte('rating', minRating).order('rating', { ascending: false });

    if (q) query = query.ilike('name', `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    const businesses = (data ?? []).filter((business: any) => {
      const districtMatches = !district || business.location?.district?.toLowerCase().includes(district.toLowerCase());
      const serviceMatches = !service || business.services?.some((item: any) => item.service?.name?.toLowerCase().includes(service.toLowerCase()));
      return districtMatches && serviceMatches;
    });

    return NextResponse.json({ businesses });
  } catch (error) {
    console.error('GET /api/businesses', error);
    return NextResponse.json({ error: 'Не удалось загрузить СТО' }, { status: 503 });
  }
}

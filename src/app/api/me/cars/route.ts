import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { data, error } = await getAdminClient().from('cars').select('id,brand,model,year,vin,plate_number,mileage,comments,created_at,updated_at').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'CARS_LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ cars: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const body = await request.json();
  const brand = String(body.brand ?? '').trim();
  const model = String(body.model ?? '').trim();
  if (!brand || !model) return NextResponse.json({ error: 'BRAND_AND_MODEL_REQUIRED' }, { status: 400 });
  const { data, error } = await getAdminClient().from('cars').insert({
    user_id: user.id,
    brand,
    model,
    year: body.year ? Number(body.year) : null,
    vin: body.vin ? String(body.vin).trim() : null,
    plate_number: body.plate_number ? String(body.plate_number).trim() : null,
    mileage: body.mileage ? Number(body.mileage) : null,
    comments: body.comments ? String(body.comments).trim() : null,
  }).select('id,brand,model,year,vin,plate_number,mileage,comments,created_at,updated_at').single();
  if (error) return NextResponse.json({ error: 'CAR_CREATE_FAILED' }, { status: 400 });
  return NextResponse.json({ car: data }, { status: 201 });
}

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

const selectFields = 'id,brand,model,year,vin,plate_number,mileage,comments,created_at,updated_at';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { data, error } = await getAdminClient().from('cars').select(selectFields).eq('user_id', user.id).order('created_at', { ascending: false });
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
  const { data, error } = await getAdminClient().from('cars').insert({ user_id: user.id, brand, model, year: body.year ? Number(body.year) : null, vin: body.vin ? String(body.vin).trim() : null, plate_number: body.plate_number ? String(body.plate_number).trim() : null, mileage: body.mileage ? Number(body.mileage) : null, comments: body.comments ? String(body.comments).trim() : null }).select(selectFields).single();
  if (error) return NextResponse.json({ error: 'CAR_CREATE_FAILED' }, { status: 400 });
  return NextResponse.json({ car: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body.id ?? '');
    const brand = String(body.brand ?? '').trim();
    const model = String(body.model ?? '').trim();
    if (!id) return NextResponse.json({ error: 'CAR_ID_REQUIRED' }, { status: 400 });
    if (!brand || !model) return NextResponse.json({ error: 'BRAND_AND_MODEL_REQUIRED' }, { status: 400 });
    const { data, error } = await getAdminClient().from('cars').update({ brand, model, year: body.year ? Number(body.year) : null, vin: body.vin ? String(body.vin).trim() : null, plate_number: body.plate_number ? String(body.plate_number).trim() : null, mileage: body.mileage ? Number(body.mileage) : null, comments: body.comments ? String(body.comments).trim() : null }).eq('id', id).eq('user_id', user.id).select(selectFields).single();
    if (error || !data) return NextResponse.json({ error: 'CAR_UPDATE_FAILED' }, { status: 400 });
    return NextResponse.json({ car: data });
  } catch {
    return NextResponse.json({ error: 'INVALID_CAR_REQUEST' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'CAR_ID_REQUIRED' }, { status: 400 });
  const { data: usage } = await getAdminClient().from('appointments').select('id').eq('car_id', id).limit(1);
  if (usage?.length) return NextResponse.json({ error: 'CAR_HAS_APPOINTMENTS' }, { status: 409 });
  const { error } = await getAdminClient().from('cars').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'CAR_DELETE_FAILED' }, { status: 400 });
  return NextResponse.json({ deleted: true });
}

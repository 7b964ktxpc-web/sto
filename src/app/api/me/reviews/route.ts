import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { data, error } = await getAdminClient()
    .from('reviews')
    .select('id,business_id,appointment_id,rating,body,is_published,created_at,business:businesses(id,name,slug)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'REVIEWS_LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const body = await request.json();
    const appointmentId = String(body.appointment_id ?? '');
    const rating = Number(body.rating ?? 0);
    const reviewBody = String(body.body ?? '').trim().slice(0, 2000);
    if (!appointmentId || !Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: 'REVIEW_FIELDS_INVALID' }, { status: 400 });
    const db = getAdminClient();
    const { data: appointment } = await db.from('appointments').select('id,business_id,status,user_id').eq('id', appointmentId).eq('user_id', user.id).maybeSingle();
    if (!appointment) return NextResponse.json({ error: 'APPOINTMENT_NOT_FOUND' }, { status: 404 });
    if (appointment.status !== 'COMPLETED') return NextResponse.json({ error: 'REVIEW_ONLY_AFTER_COMPLETION' }, { status: 409 });
    const { data, error } = await db.from('reviews').insert({ business_id: appointment.business_id, user_id: user.id, appointment_id: appointment.id, rating, body: reviewBody || null, is_published: false }).select('id,rating,body,is_published,created_at').single();
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'REVIEW_ALREADY_EXISTS' : 'REVIEW_CREATE_FAILED' }, { status: 400 });
    return NextResponse.json({ review: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'INVALID_REVIEW_REQUEST' }, { status: 400 });
  }
}

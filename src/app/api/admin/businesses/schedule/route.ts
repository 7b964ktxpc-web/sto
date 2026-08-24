import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

const DAYS = new Set([0,1,2,3,4,5,6]);
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
function validTime(value: unknown): value is string { return typeof value === 'string' && timePattern.test(value); }

export async function GET(request: Request) {
  const auth = await requirePlatformRole(['ADMIN', 'SUPER_ADMIN']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('businessId');
  if (!id) return NextResponse.json({ error: 'BUSINESS_ID_REQUIRED' }, { status: 400 });
  const db = getAdminClient();
  const [hours, exceptions] = await Promise.all([
    db.from('working_hours').select('id,weekday,starts_at,ends_at,break_starts_at,break_ends_at').eq('business_id', id).order('weekday'),
    db.from('working_exceptions').select('id,exception_date,is_closed,starts_at,ends_at,reason').eq('business_id', id).order('exception_date'),
  ]);
  if (hours.error || exceptions.error) return NextResponse.json({ error: 'SCHEDULE_LOAD_FAILED' }, { status: 503 });
  return NextResponse.json({ hours: hours.data ?? [], exceptions: exceptions.data ?? [] });
}

export async function PUT(request: Request) {
  const auth = await requirePlatformRole(['ADMIN', 'SUPER_ADMIN']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  const body = await request.json();
  const businessId = String(body.businessId ?? '');
  if (!businessId) return NextResponse.json({ error: 'BUSINESS_ID_REQUIRED' }, { status: 400 });
  const hours = Array.isArray(body.hours) ? body.hours : [];
  const exceptions = Array.isArray(body.exceptions) ? body.exceptions : [];
  if (hours.some((h: any) => !DAYS.has(Number(h.weekday)) || !validTime(h.starts_at) || !validTime(h.ends_at) || (h.break_starts_at && !validTime(h.break_starts_at)) || (h.break_ends_at && !validTime(h.break_ends_at)))) return NextResponse.json({ error: 'INVALID_WORKING_HOURS' }, { status: 400 });
  if (hours.some((h: any) => h.ends_at <= h.starts_at || ((h.break_starts_at || h.break_ends_at) && (!h.break_starts_at || !h.break_ends_at || h.break_starts_at < h.starts_at || h.break_ends_at > h.ends_at || h.break_starts_at >= h.break_ends_at)))) return NextResponse.json({ error: 'INVALID_WORKING_HOURS_RANGE' }, { status: 400 });
  if (new Set(hours.map((h:any) => Number(h.weekday))).size !== hours.length) return NextResponse.json({ error: 'DUPLICATE_WEEKDAY' }, { status: 400 });
  if (exceptions.some((e:any) => !/^\d{4}-\d{2}-\d{2}$/.test(String(e.exception_date)) || (!e.is_closed && (!validTime(e.starts_at) || !validTime(e.ends_at) || e.ends_at <= e.starts_at)))) return NextResponse.json({ error: 'INVALID_EXCEPTION' }, { status: 400 });

  const db = getAdminClient();
  const [{ data: beforeHours }, { data: beforeExceptions }] = await Promise.all([
    db.from('working_hours').select('weekday,starts_at,ends_at,break_starts_at,break_ends_at').eq('business_id', businessId).order('weekday'),
    db.from('working_exceptions').select('exception_date,is_closed,starts_at,ends_at,reason').eq('business_id', businessId).order('exception_date'),
  ]);
  const { error: deleteHoursError } = await db.from('working_hours').delete().eq('business_id', businessId);
  if (deleteHoursError) return NextResponse.json({ error: 'SCHEDULE_SAVE_FAILED' }, { status: 503 });
  const normalizedHours = hours.map((h:any) => ({ business_id: businessId, weekday: Number(h.weekday), starts_at: h.starts_at, ends_at: h.ends_at, break_starts_at: h.break_starts_at || null, break_ends_at: h.break_ends_at || null }));
  if (normalizedHours.length) { const { error } = await db.from('working_hours').insert(normalizedHours); if (error) return NextResponse.json({ error: 'SCHEDULE_SAVE_FAILED' }, { status: 503 }); }
  const { error: deleteExceptionsError } = await db.from('working_exceptions').delete().eq('business_id', businessId);
  if (deleteExceptionsError) return NextResponse.json({ error: 'EXCEPTIONS_SAVE_FAILED' }, { status: 503 });
  const normalizedExceptions = exceptions.map((e:any) => ({ business_id: businessId, exception_date: e.exception_date, is_closed: Boolean(e.is_closed), starts_at: e.is_closed ? null : e.starts_at, ends_at: e.is_closed ? null : e.ends_at, reason: String(e.reason ?? '').trim() || null }));
  if (normalizedExceptions.length) { const { error } = await db.from('working_exceptions').insert(normalizedExceptions); if (error) return NextResponse.json({ error: 'EXCEPTIONS_SAVE_FAILED' }, { status: 503 }); }
  await db.from('audit_logs').insert({ actor_user_id: auth.user.id, business_id: businessId, action: 'UPDATE', entity_type: 'BUSINESS_SCHEDULE', entity_id: businessId, reason: 'Admin schedule update', metadata: { before: { hours: beforeHours ?? [], exceptions: beforeExceptions ?? [] }, after: { hours: normalizedHours, exceptions: normalizedExceptions } } });
  return NextResponse.json({ ok: true });
}

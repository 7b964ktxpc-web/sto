import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET() {
  const auth = await requirePlatformRole(['ADMIN','SUPER_ADMIN','FINANCE']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });
  const db = getAdminClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [bookings, completed, cancelled, revenue, users, repeat] = await Promise.all([
    db.from('appointments').select('id,user_id,status,starts_at').gte('created_at', monthStart),
    db.from('appointments').select('id',{count:'exact',head:true}).eq('status','COMPLETED').gte('created_at', monthStart),
    db.from('appointments').select('id',{count:'exact',head:true}).eq('status','CANCELLED').gte('created_at', monthStart),
    db.from('payments').select('amount,status').eq('status','PAID').gte('created_at', monthStart),
    db.from('users').select('id,created_at').gte('created_at', monthStart),
    db.from('appointments').select('user_id').gte('created_at', monthStart),
  ]);
  const bookingRows = bookings.data ?? [];
  const revenueValue = (revenue.data ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const uniqueRepeatUsers = new Set((repeat.data ?? []).map((row) => row.user_id)).size;
  return NextResponse.json({ analytics: { bookings: bookingRows.length, completed: completed.count ?? 0, cancelled: cancelled.count ?? 0, revenue: revenueValue, registrations: users.data?.length ?? 0, activeUsers: uniqueRepeatUsers, conversion: bookingRows.length ? Number((((completed.count ?? 0) / bookingRows.length) * 100).toFixed(1)) : 0 } });
}

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { id } = await params;
  const { data, error } = await getAdminClient().rpc('cancel_appointment', { p_appointment_id: id, p_user_id: user.id });
  if (error) {
    const message = error.message.includes('NOT_ALLOWED') ? 'BOOKING_CANNOT_BE_CANCELLED' : 'BOOKING_CANCEL_FAILED';
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ appointment: data });
}

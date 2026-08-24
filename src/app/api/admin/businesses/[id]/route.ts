import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const allowed = ['active','pending','blocked','suspended'];
    if (typeof body.status !== 'string' || !allowed.includes(body.status)) {
      return NextResponse.json({ error: 'Некорректный статус' }, { status: 400 });
    }
    const db = getAdminClient();
    const { data, error } = await db.from('businesses').update({ status: body.status }).eq('id', id).select('id,name,status').single();
    if (error) return NextResponse.json({ error: 'Не удалось изменить статус СТО' }, { status: 400 });
    return NextResponse.json({ business: data });
  } catch {
    return NextResponse.json({ error: 'Ошибка администратора' }, { status: 500 });
  }
}

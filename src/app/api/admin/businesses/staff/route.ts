import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

const employeeStatuses = ['active', 'inactive'] as const;
const workstationStatuses = ['available', 'maintenance', 'inactive'] as const;

export async function PATCH(request: Request) {
  const auth = await requirePlatformRole(['ADMIN', 'SUPER_ADMIN']);
  if (!auth) return NextResponse.json({ error: 'ADMIN_ACCESS_REQUIRED' }, { status: 403 });

  try {
    const body = await request.json();
    const type = String(body.type ?? '');
    const id = String(body.id ?? '');
    const status = String(body.status ?? '');
    if (!id || !status) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });

    const db = getAdminClient();
    if (type === 'employee') {
      if (!employeeStatuses.includes(status as (typeof employeeStatuses)[number])) return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 });
      const { data: before, error: beforeError } = await db.from('employees').select('id,business_id,status,name,position').eq('id', id).maybeSingle();
      if (beforeError) throw beforeError;
      if (!before) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
      const { data, error } = await db.from('employees').update({ status }).eq('id', id).select('id,business_id,status,name,position').single();
      if (error) throw error;
      await db.from('audit_logs').insert({ actor_user_id: auth.user.id, business_id: before.business_id, action: 'admin.employee_status_updated', entity_type: 'employee', entity_id: id, before_data: before, after_data: data });
      return NextResponse.json({ employee: data });
    }

    if (type === 'workstation') {
      if (!workstationStatuses.includes(status as (typeof workstationStatuses)[number])) return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 });
      const { data: before, error: beforeError } = await db.from('workstations').select('id,business_id,name,status').eq('id', id).maybeSingle();
      if (beforeError) throw beforeError;
      if (!before) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
      const { data, error } = await db.from('workstations').update({ status }).eq('id', id).select('id,business_id,name,status').single();
      if (error) throw error;
      await db.from('audit_logs').insert({ actor_user_id: auth.user.id, business_id: before.business_id, action: 'admin.workstation_status_updated', entity_type: 'workstation', entity_id: id, before_data: before, after_data: data });
      return NextResponse.json({ workstation: data });
    }

    return NextResponse.json({ error: 'INVALID_TYPE' }, { status: 400 });
  } catch (error) {
    console.error('admin staff update', error);
    return NextResponse.json({ error: 'Не удалось обновить сотрудника или пост' }, { status: 503 });
  }
}

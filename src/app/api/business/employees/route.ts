import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';
import { getBusinessMembership, canManageBusiness } from '@/server/auth/business';

export async function GET() {
  const membership = await getBusinessMembership();
  if (!membership) return NextResponse.json({ error: 'BUSINESS_ACCESS_REQUIRED' }, { status: 403 });
  const { data, error } = await getAdminClient().from('employees').select('id,name,position,specialization,is_active').eq('business_id', membership.businessId).order('name');
  if (error) return NextResponse.json({ error: 'EMPLOYEES_LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ employees: data ?? [] });
}

export async function POST(request: Request) {
  const membership = await getBusinessMembership();
  if (!membership || !canManageBusiness(membership.role)) return NextResponse.json({ error: 'BUSINESS_WRITE_REQUIRED' }, { status: 403 });
  const body = await request.json();
  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'NAME_REQUIRED' }, { status: 400 });
  const { data, error } = await getAdminClient().from('employees').insert({ business_id: membership.businessId, name, position: body.position ? String(body.position).trim() : null, specialization: body.specialization ? String(body.specialization).trim() : null, is_active: true }).select('id,name,position,specialization,is_active').single();
  if (error) return NextResponse.json({ error: 'EMPLOYEE_CREATE_FAILED' }, { status: 400 });
  return NextResponse.json({ employee: data }, { status: 201 });
}

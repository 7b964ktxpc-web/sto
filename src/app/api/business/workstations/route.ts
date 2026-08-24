import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';
import { getBusinessMembership, canManageBusiness } from '@/server/auth/business';

export async function GET() {
  const membership = await getBusinessMembership();
  if (!membership) return NextResponse.json({ error: 'BUSINESS_ACCESS_REQUIRED' }, { status: 403 });
  const { data, error } = await getAdminClient().from('workstations').select('id,name,type,status,is_active').eq('business_id', membership.businessId).order('name');
  if (error) return NextResponse.json({ error: 'WORKSTATIONS_LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ workstations: data ?? [] });
}

export async function POST(request: Request) {
  const membership = await getBusinessMembership();
  if (!membership || !canManageBusiness(membership.role)) return NextResponse.json({ error: 'BUSINESS_WRITE_REQUIRED' }, { status: 403 });
  const body = await request.json();
  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'NAME_REQUIRED' }, { status: 400 });
  const { data, error } = await getAdminClient().from('workstations').insert({ business_id: membership.businessId, name, type: body.type ? String(body.type).trim() : null, status: 'AVAILABLE', is_active: true }).select('id,name,type,status,is_active').single();
  if (error) return NextResponse.json({ error: 'WORKSTATION_CREATE_FAILED' }, { status: 400 });
  return NextResponse.json({ workstation: data }, { status: 201 });
}

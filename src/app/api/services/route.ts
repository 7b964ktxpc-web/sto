import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET(){
  const {data,error}=await getAdminClient().from('services').select('id,name,slug').eq('is_active',true).order('name');
  if(error) return NextResponse.json({error:'SERVICES_LOAD_FAILED'},{status:500});
  return NextResponse.json({services:data??[]});
}

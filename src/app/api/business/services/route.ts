import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { getAdminClient } from '@/server/supabase/admin';

async function getBusinessId(userId:string){
  const { data, error } = await getAdminClient().from('business_members').select('business_id').eq('user_id',userId).in('role',['BUSINESS_OWNER','BUSINESS_MANAGER']).limit(1).maybeSingle();
  if(error) throw error;
  return data?.business_id ?? null;
}

export async function GET(){
  const user=await getCurrentUser(); if(!user) return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
  const businessId=await getBusinessId(user.id); if(!businessId) return NextResponse.json({error:'BUSINESS_ACCESS_REQUIRED'},{status:403});
  const {data,error}=await getAdminClient().from('business_services').select('id,service_id,price,min_price,duration_minutes,is_active,service:services(id,name,slug,category:service_categories(id,name))').eq('business_id',businessId).order('created_at');
  if(error) return NextResponse.json({error:'SERVICES_LOAD_FAILED'},{status:500});
  return NextResponse.json({services:data??[]});
}

export async function POST(request:Request){
  const user=await getCurrentUser(); if(!user) return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
  const businessId=await getBusinessId(user.id); if(!businessId) return NextResponse.json({error:'BUSINESS_ACCESS_REQUIRED'},{status:403});
  const body=await request.json();
  const serviceId=String(body.service_id??''); const price=Number(body.price); const duration=Number(body.duration_minutes);
  if(!serviceId||!Number.isFinite(price)||price<0||!Number.isInteger(duration)||duration<15) return NextResponse.json({error:'INVALID_SERVICE'},{status:400});
  const {data,error}=await getAdminClient().from('business_services').insert({business_id:businessId,service_id:serviceId,price,min_price:body.min_price==null?null:Number(body.min_price),duration_minutes:duration,is_active:true}).select('id,service_id,price,min_price,duration_minutes,is_active').single();
  if(error) return NextResponse.json({error:error.code==='23505'?'SERVICE_ALREADY_EXISTS':'SERVICE_CREATE_FAILED'},{status:400});
  return NextResponse.json({service:data},{status:201});
}

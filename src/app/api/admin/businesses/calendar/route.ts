import { NextResponse } from 'next/server';
import { requirePlatformRole } from '@/server/auth/platform';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET(request: Request){
  const auth=await requirePlatformRole(['ADMIN','SUPER_ADMIN','MODERATOR']);
  if(!auth) return NextResponse.json({error:'ADMIN_ACCESS_REQUIRED'},{status:403});
  const url=new URL(request.url);
  const businessId=url.searchParams.get('businessId');
  const date=url.searchParams.get('date');
  if(!businessId||!date) return NextResponse.json({error:'BUSINESS_ID_AND_DATE_REQUIRED'},{status:400});
  try{
    const db=getAdminClient();
    const start=new Date(`${date}T00:00:00+07:00`);
    const end=new Date(`${date}T23:59:59.999+07:00`);
    const [business,appointments]=await Promise.all([
      db.from('businesses').select('id,name,slug').eq('id',businessId).maybeSingle(),
      db.from('appointments').select('id,starts_at,ends_at,status,user:users(display_name,phone),service:business_services(service:services(name)),workstation:workstations(name),employee:employees(name)').eq('business_id',businessId).gte('starts_at',start.toISOString()).lte('starts_at',end.toISOString()).order('starts_at',{ascending:true})
    ]);
    if(business.error) throw business.error;
    if(appointments.error) throw appointments.error;
    return NextResponse.json({business:business.data,appointments:appointments.data??[]});
  }catch(error){console.error('admin business calendar',error);return NextResponse.json({error:'Не удалось загрузить календарь'},{status:503});}
}

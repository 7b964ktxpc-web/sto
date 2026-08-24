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
      db.from('appointments').select('id,starts_at,ends_at,status,user:users(full_name,phone),service:business_services(service:services(name))').eq('business_id',businessId).gte('starts_at',start.toISOString()).lte('starts_at',end.toISOString()).order('starts_at',{ascending:true})
    ]);
    if(business.error) throw business.error;
    if(appointments.error) throw appointments.error;

    const appointmentIds=(appointments.data??[]).map((a:any)=>a.id);
    const {data:resources,error:resourceError}=appointmentIds.length
      ? await db.from('appointment_resources').select('appointment_id,resource_type,resource_id').in('appointment_id',appointmentIds)
      : {data:[],error:null};
    if(resourceError) throw resourceError;

    const employeeIds=(resources??[]).filter((r:any)=>r.resource_type==='EMPLOYEE').map((r:any)=>r.resource_id);
    const workstationIds=(resources??[]).filter((r:any)=>r.resource_type==='WORKSTATION').map((r:any)=>r.resource_id);
    const [{data:employees,error:employeeError},{data:workstations,error:workstationError}]=await Promise.all([
      employeeIds.length?db.from('employees').select('id,name').in('id',employeeIds):Promise.resolve({data:[],error:null}),
      workstationIds.length?db.from('workstations').select('id,name').in('id',workstationIds):Promise.resolve({data:[],error:null}),
    ]);
    if(employeeError) throw employeeError;
    if(workstationError) throw workstationError;

    const employeeMap=new Map((employees??[]).map((e:any)=>[e.id,e]));
    const workstationMap=new Map((workstations??[]).map((w:any)=>[w.id,w]));
    const resourceMap=new Map<string,{employee?:{name:string}|null;workstation?:{name:string}|null}>();
    for(const r of resources??[]){
      const current=resourceMap.get(r.appointment_id)||{};
      if(r.resource_type==='EMPLOYEE') current.employee=employeeMap.get(r.resource_id)||null;
      if(r.resource_type==='WORKSTATION') current.workstation=workstationMap.get(r.resource_id)||null;
      resourceMap.set(r.appointment_id,current);
    }
    const result=(appointments.data??[]).map((a:any)=>({
      ...a,
      user:a.user?{display_name:a.user.full_name,phone:a.user.phone}:null,
      ...(resourceMap.get(a.id)||{}),
    }));
    return NextResponse.json({business:business.data,appointments:result});
  }catch(error){console.error('admin business calendar',error);return NextResponse.json({error:'Не удалось загрузить календарь'},{status:503});}
}

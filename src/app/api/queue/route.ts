import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';

export async function GET(request: Request){
  try{
    const businessId=new URL(request.url).searchParams.get('businessId');
    const db=getAdminClient();
    let q=db.from('queues').select('id,business_id,mode,is_open,queue_entries(id,position,status,estimated_wait_minutes,created_at)').order('created_at',{ascending:true});
    if(businessId) q=q.eq('business_id',businessId);
    const {data,error}=await q; if(error) throw error;
    return NextResponse.json({queues:data??[]});
  }catch{ return NextResponse.json({error:'Не удалось загрузить очередь'},{status:503}); }
}

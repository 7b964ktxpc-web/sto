import { NextResponse } from 'next/server';
import { getAdminClient } from '@/server/supabase/admin';
export async function GET(){
 try{
  const db=getAdminClient();
  const [businesses,activeBusinesses,users,appointments,queues,reviews]=await Promise.all([
   db.from('businesses').select('id,name,status,rating,created_at', {count:'exact'}).order('created_at',{ascending:false}).limit(100),
   db.from('businesses').select('id',{count:'exact',head:true}).eq('status','active'),
   db.from('users').select('id',{count:'exact',head:true}),
   db.from('appointments').select('id,status,starts_at',{count:'exact',head:true}),
   db.from('queue_entries').select('id',{count:'exact',head:true}).in('status',['WAITING','CALLED','IN_SERVICE']),
   db.from('reviews').select('id',{count:'exact',head:true})
  ]);
  return NextResponse.json({metrics:{businesses:businesses.count??0,activeBusinesses:activeBusinesses.count??0,users:users.count??0,appointments:appointments.count??0,activeQueue:queues.count??0,reviews:reviews.count??0},businesses:businesses.data??[]});
 }catch(error){console.error(error);return NextResponse.json({error:'Не удалось загрузить admin overview'},{status:503});}
}

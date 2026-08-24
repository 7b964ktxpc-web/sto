import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 });
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service');
  const query = searchParams.get('q')?.trim().toLowerCase();
  const { data: businesses, error } = await db.from('businesses').select('id,name,phone,rating,reviews_count,description').eq('status','active').eq('platform_access_status','active').is('deleted_at',null).order('rating',{ascending:false});
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids=(businesses??[]).map((b:any)=>b.id); if(!ids.length)return NextResponse.json({stations:[]});
  const {data:locations,error:locationError}=await db.from('business_locations').select('business_id,address,location,is_primary').in('business_id',ids).eq('is_primary',true);
  if(locationError)return NextResponse.json({error:locationError.message},{status:500});
  const locationByBusiness=new Map<string,any>(); for(const location of locations??[])locationByBusiness.set(location.business_id,location);
  const {data:businessServices,error:serviceError}=await db.from('business_services').select('id,business_id,service_id,price,duration_minutes,services(id,name)').in('business_id',ids).eq('is_active',true);
  if(serviceError)return NextResponse.json({error:serviceError.message},{status:500});
  const serviceByBusiness=new Map<string,any[]>(); for(const item of businessServices??[])serviceByBusiness.set(item.business_id,[...(serviceByBusiness.get(item.business_id)??[]),item]);
  const stations=(businesses??[]).map((business:any)=>{const location=locationByBusiness.get(business.id);const stationServices=serviceByBusiness.get(business.id)??[];const point=parsePoint(location?.location);return {...business,address:location?.address??'',lat:point?.lat??0,lng:point?.lng??0,station_services:stationServices};}).filter((station:any)=>{const matchesQuery=!query||station.name.toLowerCase().includes(query)||station.address.toLowerCase().includes(query)||station.station_services.some((x:any)=>x.services?.name?.toLowerCase().includes(query));const matchesService=!service||station.station_services.some((x:any)=>x.service_id===service||x.services?.name?.toLowerCase().includes(service.toLowerCase()));return matchesQuery&&matchesService;});
  return NextResponse.json({stations});
}
function parsePoint(value:unknown):{lat:number;lng:number}|null{if(!value)return null;if(typeof value==='object'&&value!==null){const candidate=value as {coordinates?:unknown};if(Array.isArray(candidate.coordinates)&&candidate.coordinates.length>=2){const lng=Number(candidate.coordinates[0]);const lat=Number(candidate.coordinates[1]);if(Number.isFinite(lat)&&Number.isFinite(lng))return{lat,lng};}}const text=String(value);const match=text.match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/i);if(!match)return null;const lng=Number(match[1]);const lat=Number(match[2]);return Number.isFinite(lat)&&Number.isFinite(lng)?{lng,lat}:null;}

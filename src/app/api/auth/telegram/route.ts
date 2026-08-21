import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateTelegramInitData } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const { initData } = await request.json();
    if (typeof initData !== 'string' || initData.length > 8000) return NextResponse.json({ error:'INVALID_INIT_DATA' }, { status:400 });
    const telegramUser = validateTelegramInitData(initData);
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ error:'SUPABASE_NOT_CONFIGURED' }, { status:503 });
    const supabase = createClient(url, serviceKey, { auth:{ persistSession:false, autoRefreshToken:false } });
    const { data, error } = await supabase.from('profiles').upsert({ telegram_id:String(telegramUser.id), first_name:telegramUser.first_name ?? null, last_name:telegramUser.last_name ?? null, username:telegramUser.username ?? null }, { onConflict:'telegram_id' }).select('id,role').single();
    if (error) return NextResponse.json({ error:'PROFILE_UPSERT_FAILED' }, { status:500 });
    return NextResponse.json({ ok:true, profileId:data.id, role:data.role });
  } catch {
    return NextResponse.json({ error:'INVALID_INIT_DATA' }, { status:401 });
  }
}

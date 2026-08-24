import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, requestIp } from '@/lib/rate-limit';

async function telegram(token:string, method:string, body:Record<string,unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) });
  if (!response.ok) throw new Error(`TELEGRAM_${method}_FAILED`);
  return response.json();
}

export async function POST(request:Request){
  const rl = rateLimit(`telegram:${requestIp(request)}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ok:false,error:'TOO_MANY_REQUESTS'},{status:429});
  try {
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (configuredSecret && request.headers.get('x-telegram-bot-api-secret-token') !== configuredSecret) {
      return NextResponse.json({ok:false,error:'UNAUTHORIZED_WEBHOOK'},{status:401});
    }
    const token=process.env.TELEGRAM_BOT_TOKEN;
    if(!token) return NextResponse.json({ok:false,error:'TELEGRAM_NOT_CONFIGURED'},{status:503});
    const update=await request.json();
    const message=update?.message;
    const chatId=message?.chat?.id;
    const text=String(message?.text??'');
    if(!chatId) return NextResponse.json({ok:true});

    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!serviceKey) throw new Error('SUPABASE_NOT_CONFIGURED');
    const db=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});

    const tgUserId=Number(message?.from?.id);
    const {data:account}=await db.from('telegram_accounts').select('user_id').eq('telegram_user_id',tgUserId).maybeSingle();
    if(!account?.user_id){
      await telegram(token,'sendMessage',{chat_id:chatId,text:'🚗 STO NSK\nОткройте Mini App из бота, чтобы подключить аккаунт и пользоваться записями.'});
      return NextResponse.json({ok:true});
    }

    const userId=account.user_id;
    if(text==='/start' || text==='/menu') {
      const appUrl=process.env.TELEGRAM_MINI_APP_URL;
      await telegram(token,'sendMessage',{chat_id:chatId,text:'🚗 STO NSK\nУправляйте записями, автомобилями и очередью прямо в Telegram.',...(appUrl?{reply_markup:{inline_keyboard:[[{text:'Открыть STO NSK',web_app:{url:appUrl}}]]}}:{})});
      return NextResponse.json({ok:true});
    }

    if(text==='/appointments'){
      const {data}=await db.from('appointments').select('starts_at,status,business:businesses(name),service:business_services(service:services(name))').eq('user_id',userId).order('starts_at',{ascending:false}).limit(5);
      const lines=(data??[]).map((a:any)=>`${new Date(a.starts_at).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'})} · ${a.business?.name??'СТО'} · ${a.service?.service?.name??'Услуга'}`);
      await telegram(token,'sendMessage',{chat_id:chatId,text:lines.length?`📅 Последние записи:\n${lines.join('\n')}`:'📅 Записей пока нет.'});
      return NextResponse.json({ok:true});
    }

    await telegram(token,'sendMessage',{chat_id:chatId,text:'Команды STO NSK:\n/start — открыть меню\n/appointments — мои последние записи'});
    return NextResponse.json({ok:true});
  } catch(error){
    console.error('telegram webhook',error);
    return NextResponse.json({ok:false,error:'WEBHOOK_FAILED'},{status:200});
  }
}

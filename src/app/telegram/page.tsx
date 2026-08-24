'use client';

import { useEffect, useMemo, useState } from 'react';

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { user?: { first_name?: string; last_name?: string; username?: string } };
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton?: { setText: (text:string) => void; show: () => void; hide: () => void; onClick: (fn: () => void) => void };
};

type Appointment = {
  id:string; business_id:string; starts_at:string; ends_at:string; status:string;
  business?:{name:string;slug:string};
  service?:{id:string;service?:{name:string}};
  car?:{brand:string;model:string;plate_number:string|null};
  workstation?:{name:string}|null;
  employee?:{name:string;position:string|null}|null;
};

type Queue = { is_open:boolean; queue_entries:Array<{id:string;position:number;status:string;estimated_wait_minutes:number|null}> };

const labels:Record<string,string>={PENDING:'Ожидает подтверждения',CONFIRMED:'Подтверждена',ARRIVED:'Клиент прибыл',IN_SERVICE:'В работе',READY:'Готов',COMPLETED:'Завершена',CANCELLED:'Отменена',NO_SHOW:'Неявка'};
const TZ='Asia/Novosibirsk';
const fmt=(value:string)=>new Intl.DateTimeFormat('ru-RU',{timeZone:TZ,dateStyle:'medium',timeStyle:'short'}).format(new Date(value));

export default function TelegramMiniApp(){
 const [tg,setTg]=useState<TelegramWebApp|null>(null);
 const [loading,setLoading]=useState(true),[authError,setAuthError]=useState(''),[appointments,setAppointments]=useState<Appointment[]>([]),[queue,setQueue]=useState<Queue|null>(null);
 const upcoming=useMemo(()=>appointments.filter(a=>['PENDING','CONFIRMED','ARRIVED','IN_SERVICE','READY'].includes(a.status)).sort((a,b)=>+new Date(a.starts_at)-+new Date(b.starts_at)),[appointments]);
 const current=upcoming[0] ?? null;

 async function load(){
   setLoading(true); setAuthError('');
   try{
     const webApp=(window as Window & { Telegram?:{ WebApp?:TelegramWebApp } }).Telegram?.WebApp;
     if(!webApp?.initData){ setAuthError('Откройте STO NSK через Telegram-бота.'); setLoading(false); return; }
     await fetch('/api/telegram/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:webApp.initData})}).then(async r=>{if(!r.ok) throw new Error((await r.json()).error||'TELEGRAM_AUTH_FAILED')});
     const [ap,me]=await Promise.all([fetch('/api/me/appointments').then(r=>r.json()),fetch('/api/me').then(r=>r.json())]);
     if(ap.error) throw new Error(ap.error);
     setAppointments(ap.appointments??[]);
     const active=(ap.appointments??[]).find((a:Appointment)=>['ARRIVED','IN_SERVICE'].includes(a.status));
     if(active?.business_id){
       const q=await fetch(`/api/queue?businessId=${encodeURIComponent(active.business_id)}`).then(r=>r.json());
       setQueue(q.queues?.[0]??null);
     }else setQueue(null);
     void me;
   }catch(error){ setAuthError(error instanceof Error?error.message:'Не удалось подключить Telegram-аккаунт.'); }
   finally{ setLoading(false); }
 }

 useEffect(()=>{
   const webApp=(window as Window & { Telegram?:{ WebApp?:TelegramWebApp } }).Telegram?.WebApp;
   if(webApp){ webApp.ready(); webApp.expand(); setTg(webApp); }
   void load();
 },[]);

 const activeQueue=queue?.queue_entries?.filter(e=>['WAITING','CALLED','IN_SERVICE'].includes(e.status))??[];
 const myQueuePosition=queue&&current&&['ARRIVED','IN_SERVICE'].includes(current.status) ? activeQueue[0] : null;

 if(authError) return <main style={{minHeight:'100dvh',padding:18,fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif'}}><div className="card"><div className="eyebrow">STO NSK · Telegram</div><h1>Откройте приложение из бота</h1><p className="muted">Telegram передаёт приложению безопасные данные авторизации только внутри Mini App.</p><a className="primary" href="/marketplace" style={{display:'inline-flex',textDecoration:'none'}}>Открыть STO NSK Web</a></div></main>;

 return <main style={{minHeight:'100dvh',padding:'calc(12px + env(safe-area-inset-top)) 14px calc(18px + env(safe-area-inset-bottom))',fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',background:'var(--tg-theme-bg-color,#f5f7fa)',color:'var(--tg-theme-text-color,#111827)'}}>
   <style>{`.tg-grid{display:grid;gap:10px}.tg-card{background:var(--tg-theme-secondary-bg-color,#fff);border-radius:18px;padding:16px;box-shadow:0 1px 0 rgba(0,0,0,.05)}.tg-muted{opacity:.65;font-size:13px}.tg-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tg-btn{display:flex;align-items:center;justify-content:center;min-height:46px;border:0;border-radius:14px;background:var(--tg-theme-button-color,#2aabee);color:var(--tg-theme-button-text-color,#fff);font-weight:700;text-decoration:none}.tg-btn.secondary{background:var(--tg-theme-secondary-bg-color,#fff);color:var(--tg-theme-text-color,#111827);border:1px solid rgba(0,0,0,.08)}.tg-status{display:inline-flex;border-radius:999px;padding:6px 9px;font-size:12px;font-weight:700;background:rgba(42,171,238,.12);color:var(--tg-theme-link-color,#2481cc)}.tg-title{margin:2px 0 6px;font-size:24px;line-height:1.05}.tg-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border-top:1px solid rgba(0,0,0,.06)}@media(max-width:390px){.tg-actions{grid-template-columns:1fr}.tg-title{font-size:22px}}`}</style>
   <div className="tg-grid">
     <header className="tg-card"><div className="tg-muted">STO NSK · Новосибирск</div><h1 className="tg-title">{tg?.initDataUnsafe?.user?.first_name?`Привет, ${tg.initDataUnsafe.user.first_name}!`:'Ваш STO NSK'}</h1><div className="tg-muted">Запись, статус визита и очередь — в одном окне.</div></header>
     {loading&&<section className="tg-card">Загружаем ваши данные…</section>}
     {!loading&&current&&<section className="tg-card"><div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'flex-start'}}><div><div className="tg-muted">Ближайший визит</div><h2 style={{margin:'4px 0'}}>{current.business?.name||'СТО'}</h2></div><span className="tg-status">{labels[current.status]||current.status}</span></div><div className="tg-row"><span>{current.service?.service?.name||'Услуга'}</span><strong>{fmt(current.starts_at)}</strong></div><div className="tg-row"><span>{current.car?.brand} {current.car?.model}</span><span>{current.workstation?.name||'Пост уточняется'}</span></div>{current.employee?.name&&<div className="tg-row"><span>Мастер</span><span>{current.employee.name}</span></div>}</section>}
     {!loading&&myQueuePosition&&<section className="tg-card"><div className="tg-muted">Живая очередь</div><div style={{fontSize:46,fontWeight:800,lineHeight:1.05,marginTop:8}}>#{myQueuePosition.position}</div><div className="tg-muted">{queue?.is_open?'Очередь открыта':'Очередь закрыта'} · ожидание {myQueuePosition.estimated_wait_minutes??'—'} мин</div></section>}
     {!loading&&!current&&<section className="tg-card"><strong>Ближайших записей нет</strong><div className="tg-muted" style={{marginTop:6}}>Выберите СТО и удобное время.</div></section>}
     <section className="tg-actions"><a className="tg-btn" href="/marketplace">Записаться</a><a className="tg-btn secondary" href="/account">Мой кабинет</a></section>
     <section className="tg-card"><div style={{fontWeight:700}}>Последние записи</div>{appointments.slice(0,4).map(a=><div className="tg-row" key={a.id}><div><strong>{a.business?.name||'СТО'}</strong><div className="tg-muted">{a.service?.service?.name||'Услуга'}</div></div><span className="tg-muted">{fmt(a.starts_at)}</span></div>)}{!appointments.length&&<div className="tg-muted" style={{marginTop:8}}>История пока пуста.</div>}</section>
   </div>
 </main>;
}

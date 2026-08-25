'use client';

import { useEffect, useMemo, useState } from 'react';

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { user?: { first_name?: string; last_name?: string; username?: string } };
  ready: () => void;
  expand: () => void;
};

type Appointment = {
  id:string; business_id:string; starts_at:string; ends_at:string; status:string;
  business?:{name:string;slug:string};
  service?:{id:string;service?:{name:string}};
  car?:{brand:string;model:string;plate_number:string|null};
  workstation?:{name:string}|null;
  employee?:{name:string;position:string|null}|null;
};

type Queue = { is_open:boolean; mode:string; queue_entries:Array<{id:string;position:number;status:string;estimated_wait_minutes:number|null}> };

type Tab='home'|'appointments'|'queue'|'account';

const labels:Record<string,string>={PENDING:'Ожидает подтверждения',CONFIRMED:'Подтверждена',ARRIVED:'Клиент прибыл',IN_SERVICE:'В работе',READY:'Готов',COMPLETED:'Завершена',CANCELLED:'Отменена',NO_SHOW:'Неявка'};
const queueLabels:Record<string,string>={WAITING:'В очереди',CALLED:'Вызван',IN_SERVICE:'В работе'};
const TZ='Asia/Novosibirsk';
const fmt=(value:string)=>new Intl.DateTimeFormat('ru-RU',{timeZone:TZ,dateStyle:'medium',timeStyle:'short'}).format(new Date(value));

export default function TelegramMiniApp(){
 const [tg,setTg]=useState<TelegramWebApp|null>(null);
 const [tab,setTab]=useState<Tab>('home');
 const [loading,setLoading]=useState(true),[authError,setAuthError]=useState(''),[appointments,setAppointments]=useState<Appointment[]>([]),[queue,setQueue]=useState<Queue|null>(null);
 const upcoming=useMemo(()=>appointments.filter(a=>['PENDING','CONFIRMED','ARRIVED','IN_SERVICE','READY'].includes(a.status)).sort((a,b)=>+new Date(a.starts_at)-+new Date(b.starts_at)),[appointments]);
 const current=upcoming[0] ?? null;
 const activeQueue=queue?.queue_entries?.filter(e=>['WAITING','CALLED','IN_SERVICE'].includes(e.status))??[];

 async function load(options:{showLoading?:boolean}={}){
   if(options.showLoading!==false) setLoading(true);
   setAuthError('');
   try{
     const webApp=(window as Window & { Telegram?:{ WebApp?:TelegramWebApp } }).Telegram?.WebApp;
     if(!webApp?.initData){ setAuthError('Откройте STO NSK через Telegram-бота.'); setLoading(false); return; }
     await fetch('/api/telegram/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:webApp.initData})}).then(async r=>{if(!r.ok) throw new Error((await r.json()).error||'TELEGRAM_AUTH_FAILED')});
     const ap=await fetch('/api/me/appointments').then(r=>r.json());
     if(ap.error) throw new Error(ap.error);
     const nextAppointments=(ap.appointments??[]) as Appointment[];
     setAppointments(nextAppointments);
     const active=nextAppointments.find(a=>['ARRIVED','IN_SERVICE'].includes(a.status));
     if(active?.business_id){
       const q=await fetch(`/api/queue?businessId=${encodeURIComponent(active.business_id)}`).then(r=>r.json());
       setQueue(q.queues?.[0]??null);
     }else setQueue(null);
   }catch(error){
     if(options.showLoading!==false || !appointments.length) setAuthError(error instanceof Error?error.message:'Не удалось подключить Telegram-аккаунт.');
   }finally{ if(options.showLoading!==false) setLoading(false); }
 }

 useEffect(()=>{
   const webApp=(window as Window & { Telegram?:{ WebApp?:TelegramWebApp } }).Telegram?.WebApp;
   if(webApp){ webApp.ready(); webApp.expand(); setTg(webApp); }
   void load();
   const refreshId=window.setInterval(()=>{ void load({showLoading:false}); },15000);
   const onVisible=()=>{ if(document.visibilityState==='visible') void load({showLoading:false}); };
   document.addEventListener('visibilitychange',onVisible);
   return()=>{
     window.clearInterval(refreshId);
     document.removeEventListener('visibilitychange',onVisible);
   };
 },[]);

 if(authError) return <main style={{minHeight:'100dvh',padding:18,fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif'}}><div className="tg-card"><div className="tg-muted">STO NSK · Telegram</div><h1>Откройте приложение из бота</h1><p className="tg-muted">Telegram передаёт приложению данные авторизации только внутри Mini App.</p><a className="tg-btn" href="/marketplace">Открыть STO NSK Web</a></div></main>;

 return <main style={{minHeight:'100dvh',padding:'calc(10px + env(safe-area-inset-top)) 12px calc(82px + env(safe-area-inset-bottom))',fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',background:'var(--tg-theme-bg-color,#f5f7fa)',color:'var(--tg-theme-text-color,#111827)'}}>
   <style>{`.tg-grid{display:grid;gap:10px;max-width:720px;margin:0 auto}.tg-card{background:var(--tg-theme-secondary-bg-color,#fff);border-radius:18px;padding:16px;box-shadow:0 1px 0 rgba(0,0,0,.05)}.tg-muted{opacity:.65;font-size:13px}.tg-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tg-btn{display:flex;align-items:center;justify-content:center;min-height:46px;border:0;border-radius:14px;background:var(--tg-theme-button-color,#2aabee);color:var(--tg-theme-button-text-color,#fff);font-weight:700;text-decoration:none}.tg-btn.secondary{background:var(--tg-theme-secondary-bg-color,#fff);color:var(--tg-theme-text-color,#111827);border:1px solid rgba(0,0,0,.08)}.tg-status{display:inline-flex;border-radius:999px;padding:6px 9px;font-size:12px;font-weight:700;background:rgba(42,171,238,.12);color:var(--tg-theme-link-color,#2481cc)}.tg-title{margin:2px 0 6px;font-size:24px;line-height:1.05}.tg-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border-top:1px solid rgba(0,0,0,.06)}.tg-queue-item{display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center;padding:11px 0;border-top:1px solid rgba(0,0,0,.06)}.tg-position{font-size:24px;font-weight:800}.tg-nav{position:fixed;left:10px;right:10px;bottom:calc(8px + env(safe-area-inset-bottom));max-width:720px;margin:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:6px;border-radius:18px;background:var(--tg-theme-secondary-bg-color,#fff);box-shadow:0 8px 28px rgba(0,0,0,.14)}.tg-nav button{min-height:48px;border:0;border-radius:14px;background:transparent;color:var(--tg-theme-hint-color,#6b7280);font:inherit;font-size:11px;font-weight:700}.tg-nav button.active{background:var(--tg-theme-button-color,#2aabee);color:var(--tg-theme-button-text-color,#fff)}@media(max-width:390px){.tg-actions{grid-template-columns:1fr}.tg-title{font-size:22px}}`}</style>

   <div className="tg-grid">
     <header className="tg-card"><div className="tg-muted">STO NSK · Новосибирск</div><h1 className="tg-title">{tg?.initDataUnsafe?.user?.first_name?`Привет, ${tg.initDataUnsafe.user.first_name}!`:'Ваш STO NSK'}</h1><div className="tg-muted">Запись, статус визита и очередь — в одном окне.</div></header>

     {loading&&<section className="tg-card">Загружаем ваши данные…</section>}

     {!loading&&tab==='home'&&<>
       {current&&<section className="tg-card"><div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'flex-start'}}><div><div className="tg-muted">Ближайший визит</div><h2 style={{margin:'4px 0'}}>{current.business?.name||'СТО'}</h2></div><span className="tg-status">{labels[current.status]||current.status}</span></div><div className="tg-row"><span>{current.service?.service?.name||'Услуга'}</span><strong>{fmt(current.starts_at)}</strong></div><div className="tg-row"><span>{current.car?.brand} {current.car?.model}</span><span>{current.workstation?.name||'Пост уточняется'}</span></div>{current.employee?.name&&<div className="tg-row"><span>Мастер</span><span>{current.employee.name}</span></div>}</section>}
       {!current&&<section className="tg-card"><strong>Ближайших записей нет</strong><div className="tg-muted" style={{marginTop:6}}>Выберите СТО и удобное время.</div></section>}
       {queue&&<section className="tg-card"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><strong>Живая очередь</strong><div className="tg-muted">{queue.mode} · {activeQueue.length} автомобилей</div></div><span className="tg-status">{queue.is_open?'Открыта':'Закрыта'}</span></div><button className="tg-btn" style={{marginTop:12}} onClick={()=>setTab('queue')}>Открыть очередь</button></section>}
       <section className="tg-actions"><a className="tg-btn" href="/marketplace">Записаться</a><button className="tg-btn secondary" onClick={()=>setTab('account')}>Мой кабинет</button></section>
     </>}

     {!loading&&tab==='appointments'&&<section className="tg-card"><h2 style={{marginTop:0}}>Мои записи</h2>{appointments.length?appointments.map(a=><div className="tg-row" key={a.id}><div><strong>{a.business?.name||'СТО'}</strong><div className="tg-muted">{a.service?.service?.name||'Услуга'} · {a.car?.brand} {a.car?.model}</div><div className="tg-muted">{fmt(a.starts_at)}</div></div><span className="tg-status">{labels[a.status]||a.status}</span></div>):<div className="tg-muted">Записей пока нет.</div>}<a className="tg-btn" href="/marketplace" style={{marginTop:12}}>Новая запись</a></section>}

     {!loading&&tab==='queue'&&<section className="tg-card"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h2 style={{margin:0}}>Живая очередь</h2><div className="tg-muted">{queue?.mode||'—'} · обновляется автоматически</div></div><span className="tg-status">{queue?.is_open?'Открыта':'Закрыта'}</span></div>{queue&&activeQueue.length?activeQueue.map(e=><div className="tg-queue-item" key={e.id}><div className="tg-position">#{e.position}</div><div><strong>{queueLabels[e.status]||e.status}</strong><div className="tg-muted">Ожидание {e.estimated_wait_minutes??'—'} мин</div></div><span className="tg-muted">{e.status==='IN_SERVICE'?'Сейчас':''}</span></div>):<div className="tg-muted" style={{marginTop:14}}>Активной очереди сейчас нет.</div>}</section>}

     {!loading&&tab==='account'&&<section className="tg-card"><div className="tg-muted">Ваш аккаунт</div><h2 style={{margin:'4px 0 10px'}}>{tg?.initDataUnsafe?.user?.first_name||'Клиент STO NSK'}</h2><div className="tg-actions"><a className="tg-btn" href="/account">Полный кабинет</a><a className="tg-btn secondary" href="/account/history">История визитов</a></div></section>}
   </div>

   <nav className="tg-nav" aria-label="Навигация Mini App">
     <button className={tab==='home'?'active':''} onClick={()=>setTab('home')}>Главная</button>
     <button className={tab==='appointments'?'active':''} onClick={()=>setTab('appointments')}>Записи</button>
     <button className={tab==='queue'?'active':''} onClick={()=>setTab('queue')}>Очередь</button>
     <button className={tab==='account'?'active':''} onClick={()=>setTab('account')}>Кабинет</button>
   </nav>
 </main>;
}

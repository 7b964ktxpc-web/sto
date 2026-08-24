'use client';

import { useEffect, useMemo, useState } from 'react';

type Appointment = {
  id:string; starts_at:string; ends_at:string; status:string; car_id:string; business_service_id:string;
  workstation_id:string|null; user_id:string; notes:string|null;
  user:{id:string;display_name:string|null;phone:string|null;email:string|null}|null;
  car:{id:string;brand:string;model:string;year:number|null;plate_number:string|null;mileage:number|null}|null;
  service:{id:string;price:number;duration_minutes:number;service:{id:string;name:string}|null}|null;
  workstation:{id:string;name:string;status:string}|null;
};
const statusLabel:Record<string,string>={PENDING:'Ожидает подтверждения',CONFIRMED:'Подтверждено',ARRIVED:'Клиент прибыл',IN_SERVICE:'В работе',READY:'Готов',COMPLETED:'Завершена',CANCELLED:'Отменена',NO_SHOW:'Неявка'};
const nextStatuses:Record<string,string[]>={PENDING:['CONFIRMED','CANCELLED'],CONFIRMED:['ARRIVED','CANCELLED'],ARRIVED:['IN_SERVICE','NO_SHOW'],IN_SERVICE:['READY'],READY:['COMPLETED']};

function startOfWeek(date:Date){const d=new Date(date); const day=(d.getDay()+6)%7; d.setHours(0,0,0,0); d.setDate(d.getDate()-day); return d;}
function toIsoDay(d:Date){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Novosibirsk'}).format(d)}

export default function BusinessCalendarPage(){
  const [mode,setMode]=useState<'day'|'week'|'month'>('day');
  const [anchor,setAnchor]=useState(new Date());
  const [filter,setFilter]=useState('');
  const [appointments,setAppointments]=useState<Appointment[]>([]);
  const [loading,setLoading]=useState(true);
  const [dragging,setDragging]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState<string|null>(null);

  const range=useMemo(()=>{
    if(mode==='day'){const from=new Date(anchor);from.setHours(0,0,0,0);const to=new Date(from);to.setDate(to.getDate()+1);return {from,to};}
    if(mode==='week'){const from=startOfWeek(anchor);const to=new Date(from);to.setDate(to.getDate()+7);return {from,to};}
    const from=new Date(anchor.getFullYear(),anchor.getMonth(),1);const to=new Date(anchor.getFullYear(),anchor.getMonth()+1,1);return {from,to};
  },[anchor,mode]);

  const load=async()=>{setLoading(true);setError('');const r=await fetch(`/api/business/appointments?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`);const x=await r.json();if(!r.ok)setError(x.error||'Не удалось загрузить расписание');else setAppointments(x.appointments??[]);setLoading(false)};
  useEffect(()=>{void load()},[range]);

  const visible=useMemo(()=>appointments.filter(a=>{
    const q=filter.trim().toLowerCase(); if(!q)return true;
    const hay=[a.id,a.user?.display_name,a.user?.phone,a.user?.email,a.car?.brand,a.car?.model,a.car?.plate_number,a.service?.service?.name,a.workstation?.name].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }),[appointments,filter]);
  const moveAnchor=(delta:number)=>{const d=new Date(anchor);d.setDate(d.getDate()+(mode==='day'?delta:mode==='week'?delta*7:delta*30));setAnchor(d)};
  const dateLabel=mode==='month'?anchor.toLocaleDateString('ru-RU',{month:'long',year:'numeric'}):range.from.toLocaleDateString('ru-RU',{dateStyle:'medium'});

  const updateAppointment=async(id:string,payload:Record<string,unknown>)=>{
    setBusy(id);setError('');
    const r=await fetch('/api/business/appointments',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,...payload})});
    const x=await r.json();setBusy(null);
    if(!r.ok){setError(x.error||'Не удалось изменить запись.');return false;}
    await load();return true;
  };

  const reschedule=async(id:string,deltaMinutes:number)=>{
    const a=appointments.find(x=>x.id===id); if(!a)return;
    const next=new Date(new Date(a.starts_at).getTime()+deltaMinutes*60000);
    await updateAppointment(id,{starts_at:next.toISOString(),workstation_id:a.workstation_id});
  };

  const labelFor=(a:Appointment)=>`${a.car?.brand||'Авто'} ${a.car?.model||''}${a.car?.plate_number?` · ${a.car.plate_number}`:''}`.trim();

  return <main className="content">
    <div className="toolbar"><div><span className="pill">STO NSK · Business</span><h1 style={{margin:'8px 0 0'}}>Расписание</h1><div className="muted">{dateLabel}</div></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="pill" onClick={()=>moveAnchor(-1)}>←</button><button className="pill" onClick={()=>setAnchor(new Date())}>Сегодня</button><button className="pill" onClick={()=>moveAnchor(1)}>→</button>{(['day','week','month'] as const).map(x=><button key={x} className={mode===x?'primary':'pill'} onClick={()=>setMode(x)}>{x==='day'?'День':x==='week'?'Неделя':'Месяц'}</button>)}</div></div>
    <div className="search" style={{gridTemplateColumns:'1fr auto',marginBottom:14}}><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Клиент, телефон, автомобиль, госномер или услуга"/><button className="primary" onClick={()=>setFilter(filter.trim())}>Найти</button></div>
    {error&&<div className="card error" style={{marginBottom:12}}>{error}</div>}
    {loading?<div className="card">Загружаем расписание…</div>:mode==='month'?<section className="card"><div className="feature-grid">{Array.from({length:new Date(anchor.getFullYear(),anchor.getMonth()+1,0).getDate()},(_,i)=>{const day=new Date(anchor.getFullYear(),anchor.getMonth(),i+1);const count=visible.filter(a=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Novosibirsk'}).format(new Date(a.starts_at))===toIsoDay(day)).length;return <button className="feature" style={{textAlign:'left',cursor:'pointer'}} key={i} onClick={()=>{setAnchor(day);setMode('day')}}><strong>{i+1}</strong><div className="muted">{count} записей</div></button>})}</div></section>:<section className="card">
      {visible.length===0?<div className="empty"><strong>Записей нет</strong><div className="muted">В выбранном периоде нет записей.</div></div>:visible.map(a=><div key={a.id} className="service-row" draggable onDragStart={()=>setDragging(a.id)} onDragEnd={()=>setDragging(null)} onDragOver={e=>e.preventDefault()} onDrop={async()=>{if(dragging&&dragging!==a.id&&dragging!==busy)await reschedule(dragging,30);setDragging(null)}}>
        <div style={{minWidth:88,fontWeight:800}}>{new Date(a.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</div>
        <div style={{flex:1,minWidth:220}}><strong>{labelFor(a)}</strong><div className="muted">{a.user?.display_name||a.user?.phone||'Клиент'} · {a.service?.service?.name||'Услуга'} · {a.service?.duration_minutes||0} мин</div><div className="muted">{a.workstation?.name||'Пост не назначен'}</div></div>
        <span className="pill">{statusLabel[a.status]||a.status}</span>
        {busy===a.id?<span className="muted">Сохраняем…</span>:<div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
          {(nextStatuses[a.status]||[]).map(next=><button key={next} className={next==='CANCELLED'||next==='NO_SHOW'?'pill':'primary'} onClick={()=>void updateAppointment(a.id,{status:next,workstation_id:a.workstation_id})}>{statusLabel[next]}</button>)}
          {a.status!=='COMPLETED'&&a.status!=='CANCELLED'&&a.status!=='NO_SHOW'&&<button className="pill" onClick={()=>void reschedule(a.id,30)}>+30 мин</button>}
        </div>}
      </div>)}
    </section>}
    <section className="section"><div className="feature-grid"><div className="feature"><strong>Day / Week / Month</strong><span className="muted">Выбор дня из месяца открывает полный day view.</span></div><div className="feature"><strong>Реальный клиент</strong><span className="muted">Календарь показывает имя, телефон, автомобиль, услугу и пост.</span></div><div className="feature"><strong>Перенос и статусы</strong><span className="muted">Изменения проходят через серверную проверку ресурсов и overlap constraints.</span></div></div></section>
  </main>;
}

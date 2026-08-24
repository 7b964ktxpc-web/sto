'use client';

import { useEffect, useMemo, useState } from 'react';

type Appointment = { id:string; starts_at:string; ends_at:string; status:string; car_id:string; business_service_id:string; workstation_id:string|null; user_id:string };
const statusLabel:Record<string,string>={PENDING:'Ожидает подтверждения',CONFIRMED:'Подтверждено',ARRIVED:'Клиент прибыл',IN_SERVICE:'В работе',READY:'Готов',COMPLETED:'Завершена',CANCELLED:'Отменена',NO_SHOW:'Неявка'};
const days=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

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

  const range=useMemo(()=>{
    if(mode==='day'){const from=new Date(anchor);from.setHours(0,0,0,0);const to=new Date(from);to.setDate(to.getDate()+1);return {from,to};}
    if(mode==='week'){const from=startOfWeek(anchor);const to=new Date(from);to.setDate(to.getDate()+7);return {from,to};}
    const from=new Date(anchor.getFullYear(),anchor.getMonth(),1);const to=new Date(anchor.getFullYear(),anchor.getMonth()+1,1);return {from,to};
  },[anchor,mode]);

  const load=async()=>{setLoading(true);setError('');const r=await fetch(`/api/business/appointments?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`);const x=await r.json();if(!r.ok)setError(x.error||'Не удалось загрузить расписание');else setAppointments(x.appointments??[]);setLoading(false)};
  useEffect(()=>{void load()},[range]);

  const visible=useMemo(()=>appointments.filter(a=>!filter||`${a.id} ${a.user_id} ${a.car_id} ${a.business_service_id}`.toLowerCase().includes(filter.toLowerCase())),[appointments,filter]);
  const moveAnchor=(delta:number)=>{const d=new Date(anchor);d.setDate(d.getDate()+(mode==='day'?delta:mode==='week'?delta*7:delta*30));setAnchor(d)};
  const dateLabel=mode==='month'?anchor.toLocaleDateString('ru-RU',{month:'long',year:'numeric'}):range.from.toLocaleDateString('ru-RU',{dateStyle:'medium'});

  const reschedule=async(id:string,deltaMinutes:number)=>{
    const a=appointments.find(x=>x.id===id); if(!a)return;
    const next=new Date(new Date(a.starts_at).getTime()+deltaMinutes*60000);
    const r=await fetch('/api/business/appointments',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,starts_at:next.toISOString(),workstation_id:a.workstation_id})});
    const x=await r.json(); if(!r.ok){setError(x.error||'Это время уже заняли. Выберите другой слот.');return;} await load();
  };

  return <main className="content">
    <div className="toolbar"><div><span className="pill">STO NSK · Business</span><h1 style={{margin:'8px 0 0'}}>Расписание</h1><div className="muted">{dateLabel}</div></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="pill" onClick={()=>moveAnchor(-1)}>←</button><button className="pill" onClick={()=>setAnchor(new Date())}>Сегодня</button><button className="pill" onClick={()=>moveAnchor(1)}>→</button>{(['day','week','month'] as const).map(x=><button key={x} className={mode===x?'primary':'pill'} onClick={()=>setMode(x)}>{x==='day'?'День':x==='week'?'Неделя':'Месяц'}</button>)}</div></div>
    <div className="search" style={{gridTemplateColumns:'1fr auto',marginBottom:14}}><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Поиск по ID клиента, автомобиля или услуги"/><button className="primary" onClick={()=>setFilter(filter.trim())}>Найти</button></div>
    {error&&<div className="card error" style={{marginBottom:12}}>{error}</div>}
    {loading?<div className="card">Загружаем расписание…</div>:mode==='month'?<section className="card"><div className="feature-grid">{Array.from({length:new Date(anchor.getFullYear(),anchor.getMonth()+1,0).getDate()},(_,i)=>{const day=new Date(anchor.getFullYear(),anchor.getMonth(),i+1);const count=visible.filter(a=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Novosibirsk'}).format(new Date(a.starts_at))===toIsoDay(day)).length;return <div className="feature" key={i}><strong>{i+1}</strong><div className="muted">{count} записей</div></div>})}</div></section>:<section className="card">
      {visible.length===0?<div className="empty"><strong>Записей нет</strong><div className="muted">В выбранном периоде нет записей.</div></div>:visible.map(a=><div key={a.id} className="service-row" draggable onDragStart={()=>setDragging(a.id)} onDragEnd={()=>setDragging(null)} onDragOver={e=>e.preventDefault()} onDrop={async()=>{if(dragging&&dragging!==a.id)await reschedule(dragging,30);setDragging(null)}}><div style={{minWidth:88,fontWeight:800}}>{new Date(a.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</div><div style={{flex:1}}><strong>#{a.id.slice(0,8)}</strong><div className="muted">Авто {a.car_id.slice(0,8)} · Услуга {a.business_service_id.slice(0,8)} · {new Date(a.starts_at).toLocaleDateString('ru-RU')}</div></div><span className="pill">{statusLabel[a.status]||a.status}</span><button className="pill" onClick={()=>reschedule(a.id,30)}>+30 мин</button></div>)}
    </section>}
    <section className="section"><div className="feature-grid"><div className="feature"><strong>Day / Week / Month</strong><span className="muted">Все представления читают реальные appointments tenant-а.</span></div><div className="feature"><strong>Drag & Drop</strong><span className="muted">Перенос проходит через серверный ресурсный контроль и PostgreSQL overlap constraints.</span></div><div className="feature"><strong>Ошибки</strong><span className="muted">При занятом времени UI получает человекочитаемое сообщение.</span></div></div></section>
  </main>;
}

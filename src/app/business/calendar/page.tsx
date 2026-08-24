'use client';

import { useEffect, useMemo, useState } from 'react';

type Appointment = {
  id:string; starts_at:string; ends_at:string; status:string; car_id:string; business_service_id:string;
  workstation_id:string|null; employee_id:string|null; user_id:string; notes:string|null;
  user:{id:string;display_name:string|null;phone:string|null;email:string|null}|null;
  car:{id:string;brand:string;model:string;year:number|null;plate_number:string|null;mileage:number|null}|null;
  service:{id:string;price:number;duration_minutes:number;service:{id:string;name:string}|null}|null;
  workstation:{id:string;name:string;status:string}|null;
};
type Resource={id:string;name:string;type?:string|null;status?:string;is_active?:boolean;specialization?:string|null;position?:string|null};
const statusLabel:Record<string,string>={PENDING:'Ожидает подтверждения',CONFIRMED:'Подтверждено',ARRIVED:'Клиент прибыл',IN_SERVICE:'В работе',READY:'Готов',COMPLETED:'Завершена',CANCELLED:'Отменена',NO_SHOW:'Неявка'};
const nextStatuses:Record<string,string[]>={PENDING:['CONFIRMED','CANCELLED'],CONFIRMED:['ARRIVED','CANCELLED'],ARRIVED:['IN_SERVICE','NO_SHOW'],IN_SERVICE:['READY'],READY:['COMPLETED']};

function startOfWeek(date:Date){const d=new Date(date); const day=(d.getDay()+6)%7; d.setHours(0,0,0,0); d.setDate(d.getDate()-day); return d;}
function toIsoDay(d:Date){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Novosibirsk'}).format(d)}

export default function BusinessCalendarPage(){
  const [mode,setMode]=useState<'day'|'week'|'month'>('day');
  const [anchor,setAnchor]=useState(new Date());
  const [filter,setFilter]=useState('');
  const [appointments,setAppointments]=useState<Appointment[]>([]);
  const [workstations,setWorkstations]=useState<Resource[]>([]);
  const [employees,setEmployees]=useState<Resource[]>([]);
  const [loading,setLoading]=useState(true);
  const [dragging,setDragging]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState<string|null>(null);

  const range=useMemo(()=>{
    if(mode==='day'){const from=new Date(anchor);from.setHours(0,0,0,0);const to=new Date(from);to.setDate(to.getDate()+1);return {from,to};}
    if(mode==='week'){const from=startOfWeek(anchor);const to=new Date(from);to.setDate(to.getDate()+7);return {from,to};}
    const from=new Date(anchor.getFullYear(),anchor.getMonth(),1);const to=new Date(anchor.getFullYear(),anchor.getMonth()+1,1);return {from,to};
  },[anchor,mode]);

  const load=async()=>{setLoading(true);setError('');
    const [ar,wr,er]=await Promise.all([
      fetch(`/api/business/appointments?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`),
      fetch('/api/business/workstations'), fetch('/api/business/employees')
    ]);
    const [ax,wx,ex]=await Promise.all([ar.json(),wr.json(),er.json()]);
    if(!ar.ok)setError(ax.error||'Не удалось загрузить расписание'); else setAppointments(ax.appointments??[]);
    if(wr.ok)setWorkstations(wx.workstations??[]);
    if(er.ok)setEmployees(ex.employees??[]);
    setLoading(false);
  };
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

  const reschedule=async(id:string,deltaMinutes:number)=>{const a=appointments.find(x=>x.id===id); if(!a)return; const next=new Date(new Date(a.starts_at).getTime()+deltaMinutes*60000); await updateAppointment(id,{starts_at:next.toISOString(),workstation_id:a.workstation_id,employee_id:a.employee_id});};
  const labelFor=(a:Appointment)=>`${a.car?.brand||'Авто'} ${a.car?.model||''}${a.car?.plate_number?` · ${a.car.plate_number}`:''}`.trim();

  return <main className="content business-calendar-page">
    <div className="toolbar business-calendar-toolbar"><div><span className="pill">STO NSK · Business</span><h1 style={{margin:'8px 0 0'}}>Расписание</h1><div className="muted">{dateLabel}</div></div><div className="business-calendar-actions"><button className="pill" onClick={()=>moveAnchor(-1)}>←</button><button className="pill" onClick={()=>setAnchor(new Date())}>Сегодня</button><button className="pill" onClick={()=>moveAnchor(1)}>→</button>{(['day','week','month'] as const).map(x=><button key={x} className={mode===x?'primary':'pill'} onClick={()=>setMode(x)}>{x==='day'?'День':x==='week'?'Неделя':'Месяц'}</button>)}</div></div>
    <div className="search business-calendar-search"><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Клиент, телефон, автомобиль, госномер или услуга"/><button className="primary" onClick={()=>setFilter(filter.trim())}>Найти</button></div>
    {error&&<div className="card error" style={{marginBottom:12}}>{error}</div>}
    <div className="feature-grid" style={{marginBottom:14}}><div className="feature"><strong>Посты</strong><span style={{fontSize:24,fontWeight:800}}>{workstations.filter(w=>w.is_active&&w.status==='AVAILABLE').length}/{workstations.filter(w=>w.is_active).length}</span><span className="muted">свободно</span></div><div className="feature"><strong>Механики</strong><span style={{fontSize:24,fontWeight:800}}>{employees.filter(e=>e.is_active!==false).length}</span><span className="muted">активных</span></div><div className="feature"><strong>Записей</strong><span style={{fontSize:24,fontWeight:800}}>{visible.length}</span><span className="muted">в периоде</span></div></div>
    {loading?<div className="card">Загружаем расписание…</div>:mode==='month'?<section className="card"><div className="feature-grid business-month-grid">{Array.from({length:new Date(anchor.getFullYear(),anchor.getMonth()+1,0).getDate()},(_,i)=>{const day=new Date(anchor.getFullYear(),anchor.getMonth(),i+1);const count=visible.filter(a=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Novosibirsk'}).format(new Date(a.starts_at))===toIsoDay(day)).length;return <button className="feature business-day-card" key={i} onClick={()=>{setAnchor(day);setMode('day')}}><strong>{i+1}</strong><div className="muted">{count} записей</div></button>})}</div></section>:<section className="card">
      {visible.length===0?<div className="empty"><strong>Записей нет</strong><div className="muted">В выбранном периоде нет записей.</div></div>:visible.map(a=><div key={a.id} className="service-row business-appointment" draggable onDragStart={()=>setDragging(a.id)} onDragEnd={()=>setDragging(null)} onDragOver={e=>e.preventDefault()} onDrop={async()=>{if(dragging&&dragging!==a.id&&dragging!==busy)await reschedule(dragging,30);setDragging(null)}}>
        <div style={{minWidth:88,fontWeight:800}}>{new Date(a.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</div>
        <div style={{flex:1,minWidth:240}}><strong>{labelFor(a)}</strong><div className="muted">{a.user?.display_name||a.user?.phone||'Клиент'} · {a.service?.service?.name||'Услуга'} · {a.service?.duration_minutes||0} мин</div><div className="muted">{a.workstation?.name||'Пост не назначен'}</div></div>
        {busy===a.id?<span className="muted">Сохраняем…</span>:<div className="business-appointment-controls">
          <select value={a.status} onChange={e=>void updateAppointment(a.id,{status:e.target.value,workstation_id:a.workstation_id,employee_id:a.employee_id})} style={{padding:'8px 10px',borderRadius:8,border:'1px solid #e2e8f0'}}><option value="PENDING">Ожидает</option><option value="CONFIRMED">Подтверждено</option><option value="ARRIVED">Прибыл</option><option value="IN_SERVICE">В работе</option><option value="READY">Готов</option><option value="COMPLETED">Завершена</option><option value="CANCELLED">Отмена</option><option value="NO_SHOW">Неявка</option></select>
          <select value={a.workstation_id||''} onChange={e=>void updateAppointment(a.id,{workstation_id:e.target.value||null,starts_at:a.starts_at,employee_id:a.employee_id})} style={{padding:'8px 10px',borderRadius:8,border:'1px solid #e2e8f0'}}><option value="">Пост не назначен</option>{workstations.filter(w=>w.is_active).map(w=><option key={w.id} value={w.id}>{w.name}{w.status==='BUSY'?' · занят':''}</option>)}</select>
          <select value={a.employee_id||''} onChange={e=>void updateAppointment(a.id,{employee_id:e.target.value||null,starts_at:a.starts_at,workstation_id:a.workstation_id})} style={{padding:'8px 10px',borderRadius:8,border:'1px solid #e2e8f0'}}><option value="">Механик не назначен</option>{employees.filter(e=>e.is_active!==false).map(e=><option key={e.id} value={e.id}>{e.name}{e.specialization?` · ${e.specialization}`:''}</option>)}</select>
          <div className="status-actions" style={{gridColumn:'1 / -1',display:'flex',gap:6,justifyContent:'flex-end',flexWrap:'wrap'}}>{(nextStatuses[a.status]||[]).map(next=><button key={next} className={next==='CANCELLED'||next==='NO_SHOW'?'pill':'primary'} onClick={()=>void updateAppointment(a.id,{status:next,workstation_id:a.workstation_id,employee_id:a.employee_id})}>{statusLabel[next]}</button>)}{a.status!=='COMPLETED'&&a.status!=='CANCELLED'&&a.status!=='NO_SHOW'&&<button className="pill" onClick={()=>void reschedule(a.id,30)}>+30 мин</button>}</div>
        </div>}
      </div>)}
    </section>}
    <section className="section"><div className="feature-grid"><div className="feature"><strong>Ресурсы СТО</strong><span className="muted">Пост и механик назначаются прямо из календаря.</span></div><div className="feature"><strong>Конфликты</strong><span className="muted">Сервер отклоняет недоступный пост или механика.</span></div><div className="feature"><strong>День / Неделя / Месяц</strong><span className="muted">Месячная сетка открывает выбранный день.</span></div></div></section>
  </main>;
}

'use client';

import { useEffect, useState } from 'react';

type Dashboard = { business:{id:string;name:string;rating:number}; appointments:any[]; workstations:any[]; services:any[]; queue:any };

export default function BusinessDashboard(){
  const [data,setData]=useState<Dashboard|null>(null); const [error,setError]=useState('');
  useEffect(()=>{fetch('/api/business/dashboard').then(r=>r.json()).then(x=>{if(x.error) throw new Error(x.error);setData(x)}).catch(()=>setError('Не удалось загрузить кабинет СТО'))},[]);
  if(error) return <main className="content"><div className="card error">{error}</div></main>;
  if(!data) return <main className="content"><div className="card">Загружаем кабинет СТО…</div></main>;
  const activeQueue=(data.queue?.queue_entries??[]).filter((x:any)=>['WAITING','CALLED','IN_SERVICE'].includes(x.status));
  return <main className="page business-dashboard"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Кабинет СТО</span><h1>{data.business.name}</h1><p>Операционный центр: записи, посты, очередь и услуги.</p></div></header><div className="content">
    <div className="feature-grid business-kpis"><div className="feature"><strong>Сегодня</strong><span className="kpi-value">{data.appointments.length}</span><span className="muted">записей</span></div><div className="feature"><strong>В работе</strong><span className="kpi-value">{data.appointments.filter(x=>x.status==='IN_SERVICE').length}</span><span className="muted">автомобилей</span></div><div className="feature"><strong>Рейтинг</strong><span className="kpi-value">★ {data.business.rating||0}</span></div></div>
    <div className="layout business-layout" style={{marginTop:16}}><section className="results">
      <div className="card"><div className="toolbar"><div><h2>Расписание сегодня</h2><div className="muted">Записи на текущий день</div></div><span className="pill">Календарь</span></div>{data.appointments.length===0?<div className="empty muted">Сегодня записей нет.</div>:data.appointments.map((a:any)=><div className="service-row business-appointment" key={a.id}><div><strong>{new Date(a.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</strong><div className="muted">{a.status}</div></div><span className="pill">{a.workstation_id?'Пост назначен':'Пост не назначен'}</span></div>)}</div>
      <div className="card"><div className="toolbar"><div><h2>Услуги</h2><div className="muted">Активный прайс</div></div><button className="primary">Добавить услугу</button></div>{data.services.map((s:any)=><div className="service-row" key={s.id}><span>{s.service?.name}</span><strong>от {Number(s.price).toLocaleString('ru-RU')} ₽</strong><span>{s.duration_minutes} мин</span></div>)}</div>
    </section><aside className="results"><div className="card"><h2>Посты</h2>{data.workstations.map((w:any)=><div className="service-row" key={w.id}><span>{w.name}</span><span className={w.status==='AVAILABLE'?'green':'yellow'}>{w.status}</span></div>)}</div><div className="card"><h2>Живая очередь</h2><div className="queue-number">{activeQueue.length}</div><div className="muted">активных автомобилей</div><div style={{marginTop:12}}>{activeQueue.slice(0,5).map((q:any)=><div className="service-row" key={q.id}><span>#{q.position}</span><span>{q.status}</span><span>{q.estimated_wait_minutes??'—'} мин</span></div>)}</div></div></aside></div>
  </div></main>;
}

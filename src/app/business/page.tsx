'use client';

import { useEffect, useState } from 'react';

type Dashboard = { business:{id:string;name:string;rating:number}; appointments:any[]; workstations:any[]; services:any[]; queue:any };

export default function BusinessDashboard(){
  const [data,setData]=useState<Dashboard|null>(null); const [error,setError]=useState('');
  useEffect(()=>{fetch('/api/business/dashboard').then(r=>r.json()).then(x=>{if(x.error) throw new Error(x.error);setData(x)}).catch(()=>setError('Не удалось загрузить кабинет СТО'))},[]);
  if(error) return <main className="content"><div className="card error">{error}</div></main>;
  if(!data) return <main className="content"><div className="card">Загружаем кабинет СТО…</div></main>;
  const activeQueue=(data.queue?.queue_entries??[]).filter((x:any)=>['WAITING','CALLED','IN_SERVICE'].includes(x.status));
  return <main className="page business-dashboard"><style>{`
    .business-dashboard .kpi-value{display:block;font-size:28px;font-weight:800;line-height:1.1;margin-top:4px}
    .business-dashboard .queue-number{font-size:38px;font-weight:800;line-height:1;margin:12px 0 4px}
    .business-dashboard .business-layout{align-items:start}
    .business-dashboard .business-appointment{align-items:center}
    .business-dashboard .quick-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:16px 0}
    .business-dashboard .quick-actions a{text-decoration:none;display:flex;align-items:center;justify-content:center;min-height:44px}
    @media(max-width:720px){.business-dashboard .quick-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:560px){
      .business-dashboard .hero{padding-bottom:30px}
      .business-dashboard .hero h1{font-size:32px;line-height:1.05}
      .business-dashboard .content{padding-left:12px;padding-right:12px}
      .business-dashboard .business-kpis{grid-template-columns:repeat(3,1fr);gap:7px}
      .business-dashboard .business-kpis .feature{padding:12px 9px;border-radius:14px}
      .business-dashboard .business-kpis .feature strong{font-size:11px}
      .business-dashboard .business-kpis .kpi-value{font-size:21px}
      .business-dashboard .business-layout{display:grid;grid-template-columns:1fr!important;gap:10px}
      .business-dashboard .business-layout .card{padding:14px;border-radius:16px}
      .business-dashboard .toolbar{gap:8px;align-items:flex-start}
      .business-dashboard .toolbar h2{font-size:18px}
      .business-dashboard .service-row{gap:8px;padding:11px 0;flex-wrap:wrap}
      .business-dashboard .business-appointment{align-items:flex-start}
      .business-dashboard .business-appointment .pill{margin-left:auto}
      .business-dashboard .card .primary{min-height:42px;padding:0 12px;font-size:13px}
      body:has(.business-dashboard) .mobile-nav{display:none!important}
    }
    @media(min-width:561px){body:has(.business-dashboard) .mobile-nav{display:none!important}}
  `}</style>
  <header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Кабинет СТО</span><h1>{data.business.name}</h1><p>Операционный центр: записи, посты, очередь и услуги.</p></div></header><div className="content">
    <div className="feature-grid business-kpis"><div className="feature"><strong>Сегодня</strong><span className="kpi-value">{data.appointments.length}</span><span className="muted">записей</span></div><div className="feature"><strong>В работе</strong><span className="kpi-value">{data.appointments.filter(x=>x.status==='IN_SERVICE').length}</span><span className="muted">автомобилей</span></div><div className="feature"><strong>Рейтинг</strong><span className="kpi-value">★ {data.business.rating||0}</span></div></div>
    <nav className="quick-actions" aria-label="Быстрые действия"><a className="primary" href="/business/calendar">Календарь</a><a className="pill" href="/business/queue">Живая очередь</a><a className="pill" href="/business/services">Услуги</a><a className="pill" href="/business/workstations">Посты</a></nav>
    <div className="layout business-layout" style={{marginTop:16}}><section className="results">
      <div className="card"><div className="toolbar"><div><h2>Расписание сегодня</h2><div className="muted">Записи на текущий день</div></div><a className="pill" href="/business/calendar" style={{textDecoration:'none'}}>Открыть календарь</a></div>{data.appointments.length===0?<div className="empty muted">Сегодня записей нет.</div>:data.appointments.map((a:any)=><div className="service-row business-appointment" key={a.id}><div><strong>{new Date(a.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</strong><div className="muted">{a.status}</div></div><span className="pill">{a.workstation_id?'Пост назначен':'Пост не назначен'}</span></div>)}</div>
      <div className="card"><div className="toolbar"><div><h2>Услуги</h2><div className="muted">Активный прайс</div></div><a className="primary" href="/business/services" style={{textDecoration:'none'}}>Управлять услугами</a></div>{data.services.length===0?<div className="empty muted">Услуги ещё не добавлены.</div>:data.services.map((s:any)=><div className="service-row" key={s.id}><span>{s.service?.name}</span><strong>от {Number(s.price).toLocaleString('ru-RU')} ₽</strong><span>{s.duration_minutes} мин</span></div>)}</div>
    </section><aside className="results"><div className="card"><div className="toolbar"><h2>Посты</h2><a className="pill" href="/business/workstations" style={{textDecoration:'none'}}>Управлять</a></div>{data.workstations.length===0?<div className="empty muted">Посты ещё не настроены.</div>:data.workstations.map((w:any)=><div className="service-row" key={w.id}><span>{w.name}</span><span className={w.status==='AVAILABLE'?'green':'yellow'}>{w.status}</span></div>)}</div><div className="card"><div className="toolbar"><h2>Живая очередь</h2><a className="pill" href="/business/queue" style={{textDecoration:'none'}}>Открыть</a></div><div className="queue-number">{activeQueue.length}</div><div className="muted">активных автомобилей</div><div style={{marginTop:12}}>{activeQueue.slice(0,5).map((q:any)=><div className="service-row" key={q.id}><span>#{q.position}</span><span>{q.status}</span><span>{q.estimated_wait_minutes??'—'} мин</span></div>)}</div></div></aside></div>
  </div></main>;
}

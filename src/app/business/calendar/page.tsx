'use client';

import { useMemo, useState } from 'react';

const rows = [
  { time:'09:00', car:'Toyota Camry', service:'Замена масла', client:'Иван Петров', duration:60, status:'Подтверждено' },
  { time:'10:30', car:'Kia Sportage', service:'Диагностика ходовой', client:'Анна Смирнова', duration:45, status:'Ожидает подтверждения' },
  { time:'12:00', car:'Lada Vesta', service:'Шиномонтаж', client:'Максим К.', duration:60, status:'Подтверждено' },
  { time:'14:30', car:'BMW X5', service:'Замена тормозных дисков', client:'Олег К.', duration:120, status:'Подтверждено' },
  { time:'17:00', car:'Hyundai Solaris', service:'Компьютерная диагностика', client:'Екатерина Л.', duration:45, status:'Подтверждено' },
];

export default function BusinessCalendarPage(){
  const [mode,setMode]=useState<'day'|'week'|'month'>('day');
  const [filter,setFilter]=useState('');
  const visible=useMemo(()=>rows.filter(r=>!filter||r.car.toLowerCase().includes(filter.toLowerCase())||r.client.toLowerCase().includes(filter.toLowerCase())||r.service.toLowerCase().includes(filter.toLowerCase())),[filter]);
  return <main className="content">
    <div className="toolbar"><div><span className="pill">STO NSK · Business</span><h1 style={{margin:'8px 0 0'}}>Расписание</h1><div className="muted">Сегодня · 24 августа 2026</div></div><div style={{display:'flex',gap:8}}>{(['day','week','month'] as const).map(x=><button key={x} className={mode===x?'primary':'pill'} onClick={()=>setMode(x)}>{x==='day'?'День':x==='week'?'Неделя':'Месяц'}</button>)}</div></div>
    <div className="search" style={{gridTemplateColumns:'1fr auto',marginBottom:14}}><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Поиск по клиенту, автомобилю или услуге"/><button className="primary" onClick={()=>setFilter(filter.trim())}>Найти</button></div>
    {mode==='day' && <section className="card">{visible.map((r,i)=><div key={i} className="service-row" draggable onDragStart={e=>e.dataTransfer.setData('text/plain',String(i))} onDragOver={e=>e.preventDefault()}><div style={{minWidth:72,fontWeight:800}}>{r.time}</div><div style={{flex:1}}><strong>{r.car}</strong><div className="muted">{r.service} · {r.client} · {r.duration} мин</div></div><span className="pill">{r.status}</span></div>)}</section>}
    {mode==='week' && <section className="feature-grid">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d,i)=><div className="feature" key={d}><strong>{d} · {24+i}</strong><div className="muted">{2+i%4} записи</div><div style={{marginTop:10}}>{rows.slice(0,(i%3)+1).map(r=><div key={r.time} className="service-row"><span>{r.time}</span><strong>{r.car}</strong></div>)}</div></div>)}</section>}
    {mode==='month' && <section className="card"><div className="feature-grid">{Array.from({length:30},(_,i)=><div key={i} className="feature"><strong>{i+1}</strong><div className="muted">{i%5} записи</div></div>)}</div></section>}
    <section className="section"><div className="feature-grid"><div className="feature"><strong>Drag & Drop</strong><span className="muted">Перенос записи подготовлен: серверная проверка доступности сохраняется отдельным booking operation.</span></div><div className="feature"><strong>Посты</strong><span className="muted">Ресурсная модель уже учитывается в booking constraints.</span></div><div className="feature"><strong>Сотрудники</strong><span className="muted">Следующий слой — матрица доступности сотрудника и услуги.</span></div></div></section>
  </main>;
}

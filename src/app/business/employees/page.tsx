'use client';

import { useEffect, useState } from 'react';

type Employee={id:string;name:string;position:string|null;specialization:string|null;is_active:boolean};

export default function BusinessEmployeesPage(){
 const [items,setItems]=useState<Employee[]>([]); const [name,setName]=useState(''); const [position,setPosition]=useState(''); const [specialization,setSpecialization]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 const load=async()=>{const r=await fetch('/api/business/employees');const x=await r.json();if(!r.ok){setError(x.error||'Не удалось загрузить сотрудников');return}setItems(x.employees??[])};
 useEffect(()=>{void load()},[]);
 const add=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');const r=await fetch('/api/business/employees',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,position,specialization})});const x=await r.json();if(!r.ok)setError(x.error||'Не удалось добавить сотрудника');else{setName('');setPosition('');setSpecialization('');await load()}setBusy(false)};
 return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Business</span><h1>Сотрудники</h1><p>Команда СТО и специализации, доступные для записи.</p></div></header><div className="content"><div className="layout"><section className="results"><div className="card"><div className="toolbar"><div><h2>Команда</h2><div className="muted">{items.length} сотрудников</div></div><span className="pill">Tenant</span></div>{items.length===0?<div className="empty muted">Пока нет сотрудников.</div>:items.map(x=><div className="service-row" key={x.id}><div><strong>{x.name}</strong><div className="muted">{x.position||'Должность не указана'}{x.specialization?` · ${x.specialization}`:''}</div></div><span className={x.is_active?'green':'muted'}>{x.is_active?'Активен':'Неактивен'}</span></div>)}</div></section><aside className="card"><h2>Добавить сотрудника</h2><form onSubmit={add} style={{display:'grid',gap:10,marginTop:12}}><input placeholder="Имя" value={name} onChange={e=>setName(e.target.value)} required/><input placeholder="Должность" value={position} onChange={e=>setPosition(e.target.value)}/><input placeholder="Специализация" value={specialization} onChange={e=>setSpecialization(e.target.value)}/><button className="primary" disabled={busy}>{busy?'Сохраняем…':'Добавить'}</button></form>{error&&<div className="error" style={{marginTop:12}}>{error}</div>}</aside></div></div></main>;
}

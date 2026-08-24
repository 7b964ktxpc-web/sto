'use client';

import { useEffect, useState } from 'react';

type Workstation={id:string;name:string;type:string|null;status:string;is_active:boolean};
const labels:Record<string,string>={AVAILABLE:'Свободен',BUSY:'Занят',OFFLINE:'Отключён'};

export default function BusinessWorkstationsPage(){
 const [items,setItems]=useState<Workstation[]>([]); const [name,setName]=useState(''); const [type,setType]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 const load=async()=>{const r=await fetch('/api/business/workstations');const x=await r.json();if(!r.ok){setError(x.error||'Не удалось загрузить посты');return}setItems(x.workstations??[])};
 useEffect(()=>{void load()},[]);
 const add=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');const r=await fetch('/api/business/workstations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,type})});const x=await r.json();if(!r.ok)setError(x.error||'Не удалось добавить пост');else{setName('');setType('');await load()}setBusy(false)};
 return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Business</span><h1>Посты и подъёмники</h1><p>Ресурсы, которые booking engine использует для расчёта доступности.</p></div></header><div className="content"><div className="layout"><section className="results"><div className="card"><div className="toolbar"><div><h2>Ресурсы</h2><div className="muted">{items.length} постов</div></div><span className="pill">Scheduling</span></div>{items.length===0?<div className="empty muted">Пока нет постов.</div>:items.map(x=><div className="service-row" key={x.id}><div><strong>{x.name}</strong><div className="muted">{x.type||'Тип не указан'}</div></div><span className={x.status==='AVAILABLE'?'green':x.status==='BUSY'?'yellow':'muted'}>{labels[x.status]||x.status}</span></div>)}</div></section><aside className="card"><h2>Добавить пост</h2><form onSubmit={add} style={{display:'grid',gap:10,marginTop:12}}><input placeholder="Название" value={name} onChange={e=>setName(e.target.value)} required/><input placeholder="Тип: подъёмник, шиномонтаж…" value={type} onChange={e=>setType(e.target.value)}/><button className="primary" disabled={busy}>{busy?'Сохраняем…':'Добавить пост'}</button></form>{error&&<div className="error" style={{marginTop:12}}>{error}</div>}</aside></div></div></main>;
}

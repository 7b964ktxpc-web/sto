'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Detail={business?:{id:string;name:string};employees:Array<{id:string;name:string;position:string|null;is_active:boolean}>;workstations:Array<{id:string;name:string;status:string}>};
const wsStatuses=['AVAILABLE','BUSY','OFFLINE','MAINTENANCE'];

export default function ManageBusinessPeople(){
 const {id}=useParams<{id:string}>(); const router=useRouter(); const [data,setData]=useState<Detail|null>(null); const [error,setError]=useState(''); const [busy,setBusy]=useState('');
 async function load(){const r=await fetch(`/api/admin/businesses/detail?id=${encodeURIComponent(id)}`);const x=await r.json();if(r.status===403){router.replace('/admin/login');return}if(!r.ok)throw new Error(x.error);setData(x)}
 useEffect(()=>{void load().catch(()=>setError('Не удалось загрузить команду и посты.'))},[id]);
 async function update(type:'employee'|'workstation',entityId:string,status:string){setBusy(entityId);setError('');try{const r=await fetch('/api/admin/businesses/staff',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({type,id:entityId,status})});const x=await r.json();if(r.status===403){router.replace('/admin/login');return}if(!r.ok)throw new Error(x.error);await load()}catch(e){setError(e instanceof Error?e.message:'Не удалось сохранить')}finally{setBusy('')}}
 if(error&&!data)return <main className="content"><div className="card error">{error}</div></main>;
 if(!data?.business)return <main className="content"><div className="card">Загружаем…</div></main>;
 return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Admin</span><h1>Команда и посты</h1><p>{data.business.name}</p></div></header><div className="content"><div className="toolbar"><a className="pill" href={`/admin/businesses/${id}`}>← Карточка СТО</a></div>{error&&<div className="card error" style={{marginTop:12}}>{error}</div>}
 <section className="card" style={{marginTop:16}}><div className="toolbar"><div><h2>Сотрудники</h2><div className="muted">Включение и отключение сотрудников.</div></div><span className="pill">{data.employees.length}</span></div>{data.employees.length?data.employees.map(e=><div className="service-row" key={e.id}><div style={{flex:1}}><strong>{e.name}</strong><div className="muted">{e.position||'Должность не указана'}</div></div><select value={e.is_active?'active':'inactive'} disabled={busy===e.id} onChange={ev=>void update('employee',e.id,ev.target.value)}><option value="active">Активен</option><option value="inactive">Неактивен</option></select></div>):<div className="empty">Сотрудников нет.</div>}</section>
 <section className="card" style={{marginTop:16}}><div className="toolbar"><div><h2>Рабочие посты</h2><div className="muted">Текущий технический статус каждого поста.</div></div><span className="pill">{data.workstations.length}</span></div>{data.workstations.length?data.workstations.map(w=><div className="service-row" key={w.id}><div style={{flex:1}}><strong>{w.name}</strong></div><select value={w.status} disabled={busy===w.id} onChange={ev=>void update('workstation',w.id,ev.target.value)}>{wsStatuses.map(s=><option key={s} value={s}>{s}</option>)}</select></div>):<div className="empty">Постов нет.</div>}</section>
 </div><style jsx>{`select{padding:9px 10px;border:1px solid rgba(0,0,0,.12);border-radius:9px;background:#fff}`}</style></main>;
}

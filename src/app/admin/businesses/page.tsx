'use client';

import { FormEvent, useEffect, useState } from 'react';

type Business={id:string;name:string;slug:string|null;status:string;rating:number|null;review_count:number|null;phone:string|null;address:string|null;created_at:string};

const labels:Record<string,string>={active:'Активна',pending:'На модерации',blocked:'Заблокирована',suspended:'Приостановлена'};
const statuses=['','active','pending','blocked','suspended'];

export default function AdminBusinessesPage(){
 const [q,setQ]=useState(''); const [status,setStatus]=useState(''); const [items,setItems]=useState<Business[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 async function load(){setLoading(true);setError('');try{const p=new URLSearchParams();if(q.trim())p.set('q',q.trim());if(status)p.set('status',status);const r=await fetch(`/api/admin/businesses?${p}`);const x=await r.json();if(r.status===403){window.location.href='/admin/login';return}if(!r.ok)throw new Error(x.error||'LOAD_FAILED');setItems(x.businesses??[])}catch{setError('Не удалось загрузить список СТО.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[status]);
 const submit=(e:FormEvent)=>{e.preventDefault();void load()};
 return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Admin</span><h1>СТО</h1><p>Поиск и оперативное управление организациями marketplace.</p></div></header><div className="content">
   <section className="card"><form onSubmit={submit} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 220px auto',gap:10}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Название, адрес или телефон"/><select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s?labels[s]:'Все статусы'}</option>)}</select><button className="primary" type="submit">Искать</button></form></section>
   {error&&<div className="card error" style={{marginTop:12}}>{error}</div>}
   <section className="card" style={{marginTop:12}}><div className="toolbar"><div><h2>Результаты</h2><div className="muted">До 100 последних организаций.</div></div><span className="pill">{items.length}</span></div>
   {loading?<div className="empty">Загружаем список…</div>:items.length===0?<div className="empty">По заданным условиям ничего не найдено.</div>:items.map(b=><div className="service-row" key={b.id}><div style={{flex:1,minWidth:0}}><strong>{b.name}</strong><div className="muted">{b.address||'Адрес не указан'}{b.phone?` · ${b.phone}`:''}</div><div className="muted">★ {b.rating||0} · {b.review_count||0} отзывов</div></div><span className="pill">{labels[b.status]||b.status}</span>{b.slug&&<a className="pill" href={`/novosibirsk/sto/${b.slug}`}>Открыть</a>}</div>)}
   </section>
 </div><style jsx>{`@media(max-width:700px){form{grid-template-columns:1fr!important}.service-row{align-items:flex-start;flex-wrap:wrap}.service-row>a{margin-left:auto}}`}</style></main>;
}

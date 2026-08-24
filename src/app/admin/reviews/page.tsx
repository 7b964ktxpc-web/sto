'use client';

import { useEffect, useState } from 'react';

type Review={id:string;business_id:string;user_id:string;appointment_id:string|null;rating:number;body:string|null;is_published:boolean;created_at:string};

export default function AdminReviewsPage(){
 const [items,setItems]=useState<Review[]>([]); const [error,setError]=useState('');
 const load=async()=>{const r=await fetch('/api/admin/reviews');const x=await r.json();if(!r.ok){setError(x.error||'Нет доступа к модерации');return}setItems(x.reviews??[])};
 useEffect(()=>{void load()},[]);
 const toggle=async(item:Review)=>{const r=await fetch('/api/admin/reviews',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,is_published:!item.is_published})});if(!r.ok){setError('Не удалось изменить публикацию отзыва');return}await load()};
 return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Moderation</span><h1>Отзывы</h1><p>Публикация и скрытие отзывов с audit trail.</p></div></header><div className="content"><div className="card">{error&&<div className="error" style={{marginBottom:12}}>{error}</div>}{items.length===0?<div className="empty muted">Отзывов пока нет.</div>:items.map(x=><div className="service-row" key={x.id}><div style={{minWidth:0,flex:1}}><div><strong>★ {x.rating}/5</strong><span className="muted"> · {new Date(x.created_at).toLocaleString('ru-RU')}</span></div><div className="muted" style={{marginTop:4,whiteSpace:'pre-wrap'}}>{x.body||'Без текста'}</div></div><div style={{display:'flex',alignItems:'center',gap:8}}><span className="pill">{x.is_published?'Опубликован':'Скрыт'}</span><button className="pill" onClick={()=>toggle(x)}>{x.is_published?'Скрыть':'Опубликовать'}</button></div></div>)}</div></div></main>;
}

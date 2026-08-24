'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Row={id:string;starts_at:string;ends_at:string;status:string;user?:{display_name:string|null;phone:string|null};service?:{service?:{name:string}};workstation?:{name:string}|null;employee?:{name:string}|null};
const labels:Record<string,string>={PENDING:'Ожидает',CONFIRMED:'Подтверждена',ARRIVED:'Прибыл',IN_SERVICE:'В работе',READY:'Готов',COMPLETED:'Завершена',CANCELLED:'Отменена',NO_SHOW:'Неявка'};
const TZ='Asia/Novosibirsk';
const fmt=(v:string)=>new Intl.DateTimeFormat('ru-RU',{timeZone:TZ,dateStyle:'medium',timeStyle:'short'}).format(new Date(v));

export default function AdminBusinessCalendar(){
 const {id}=useParams<{id:string}>(); const router=useRouter();
 const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10)); const [rows,setRows]=useState<Row[]>([]); const [business,setBusiness]=useState<{name:string;slug:string}|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 async function load(){setLoading(true);setError('');try{const r=await fetch(`/api/admin/businesses/calendar?businessId=${encodeURIComponent(id)}&date=${date}`);const x=await r.json();if(r.status===403){router.replace('/admin/login');return}if(!r.ok)throw new Error(x.error||'CALENDAR_FAILED');setRows(x.appointments??[]);setBusiness(x.business??null)}catch(e){setError(e instanceof Error?e.message:'Не удалось загрузить календарь')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[id,date]);
 const active=useMemo(()=>rows.filter(r=>!['CANCELLED','COMPLETED','NO_SHOW'].includes(r.status)),[rows]);
 return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Календарь</span><h1>{business?.name||'Календарь записей'}</h1><p>{date} · активных записей: {active.length}</p></div></header><div className="content"><div className="toolbar"><a className="pill" href={`/admin/businesses/${id}`}>← Карточка СТО</a><input aria-label="Дата" type="date" value={date} onChange={e=>setDate(e.target.value)} /><button className="pill" onClick={()=>{setDate(new Date().toISOString().slice(0,10))}}>Сегодня</button></div>{error&&<div className="card error" style={{marginTop:12}}>{error}</div>}<section className="card" style={{marginTop:16}}>{loading?<div className="empty">Загружаем записи…</div>:rows.length===0?<div className="empty">На этот день записей нет.</div>:rows.map(a=><div className="service-row" key={a.id}><div style={{flex:1,minWidth:0}}><strong>{a.user?.display_name||'Клиент'}</strong><div className="muted">{a.service?.service?.name||'Услуга'} · {fmt(a.starts_at)}–{fmt(a.ends_at)}</div><div className="muted">{a.workstation?.name||'Пост не назначен'}{a.employee?.name?` · ${a.employee.name}`:''}{a.user?.phone?` · ${a.user.phone}`:''}</div></div><span className="pill">{labels[a.status]||a.status}</span><a className="pill" href={`/admin/appointments/${a.id}`}>Открыть</a></div>)}</section></div><style jsx>{`input{padding:9px 10px;border:1px solid rgba(0,0,0,.12);border-radius:9px;background:#fff;font:inherit}.toolbar{flex-wrap:wrap}`}</style></main>;
}

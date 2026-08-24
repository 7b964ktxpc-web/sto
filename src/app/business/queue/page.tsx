'use client';

import { useEffect, useState } from 'react';

type Entry={id:string;status:string;position:number;estimated_wait_minutes:number|null};
const flow=[['WAITING','В очереди'],['CALLED','Вызван'],['IN_SERVICE','В работе'],['READY','Готов'],['COMPLETED','Завершён']];

export default function BusinessQueuePage(){
 const [entries,setEntries]=useState<Entry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async()=>{setLoading(true);const r=await fetch('/api/business/queue');const x=await r.json();if(!r.ok)setError(x.error||'Не удалось загрузить очередь');else setEntries((x.queue?.queue_entries??[]).sort((a:Entry,b:Entry)=>a.position-b.position));setLoading(false)};
 useEffect(()=>{void load();const t=setInterval(load,15000);return()=>clearInterval(t)},[]);
 const update=async(id:string,status:string)=>{setError('');const r=await fetch('/api/business/queue',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({entry_id:id,status})});const x=await r.json();if(!r.ok)setError(x.error||'Не удалось изменить статус');else await load()};
 return <main className="content"><div className="toolbar"><div><span className="pill">STO NSK · Business</span><h1 style={{margin:'8px 0 0'}}>Живая очередь</h1><div className="muted">Статусы обновляются автоматически</div></div></div>{error&&<div className="card error" style={{marginBottom:12}}>{error}</div>}{loading?<div className="card">Загружаем очередь…</div>:<section className="card">{entries.length===0?<div className="empty"><strong>Очередь пуста</strong><div className="muted">Новые автомобили появятся здесь.</div></div>:entries.map(e=><div className="service-row" key={e.id}><div style={{minWidth:56,fontWeight:850}}>#{e.position}</div><div style={{flex:1}}><strong>Автомобиль {e.id.slice(0,8)}</strong><div className="muted">Ожидание: {e.estimated_wait_minutes??'—'} мин</div></div><span className="pill">{flow.find(x=>x[0]===e.status)?.[1]||e.status}</span><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{flow.map(([s,label])=><button key={s} className={e.status===s?'primary':'pill'} onClick={()=>update(e.id,s)}>{label}</button>)}</div></div>)}</section>}</main>;
}

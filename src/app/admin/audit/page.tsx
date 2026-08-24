'use client';
import { useEffect, useState } from 'react';

type Log={id:string;actor_user_id:string|null;action:string;entity_type:string|null;entity_id:string|null;metadata:Record<string,unknown>|null;created_at:string};
export default function AdminAuditPage(){
 const [logs,setLogs]=useState<Log[]>([]); const [error,setError]=useState('');
 useEffect(()=>{fetch('/api/admin/audit').then(async r=>{const x=await r.json();if(!r.ok)throw new Error(x.error||'Нет доступа');setLogs(x.logs??[])}).catch(e=>setError(e instanceof Error?e.message:'Не удалось загрузить audit log'))},[]);
 return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Security</span><h1>Audit log</h1><p>Критические действия администраторов и модераторов.</p></div></header><div className="content"><div className="card">{error&&<div className="error" style={{marginBottom:12}}>{error}</div>}{!error&&logs.length===0?<div className="empty muted">Записей пока нет.</div>:logs.map(log=><div className="service-row" key={log.id}><div style={{flex:1}}><strong>{log.action}</strong><div className="muted">{log.entity_type||'entity'}{log.entity_id?` · ${log.entity_id.slice(0,8)}`:''}</div></div><div style={{textAlign:'right'}}><div className="pill">{new Date(log.created_at).toLocaleString('ru-RU')}</div><div className="muted" style={{marginTop:4}}>{log.actor_user_id?log.actor_user_id.slice(0,8):'system'}</div></div></div>)}</div></div></main>;
}

'use client';

import { useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Entry={id:string;position:number;status:string;estimated_wait_minutes:number|null};
type Queue={id:string;business_id:string;mode:string;is_open:boolean;queue_entries:Entry[]};

export default function QueuePage(){
 const [queues,setQueues]=useState<Queue[]>([]);
 useEffect(()=>{
   let db: SupabaseClient | null = null;
   const load=()=>fetch('/api/queue').then(r=>r.json()).then(x=>setQueues(x.queues??[]));
   load();
   const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
   const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
   if(url && key){
     db=createClient(url,key);
     const channel=db.channel('sto-queue').on('postgres_changes',{event:'*',schema:'public',table:'queue_entries'},load).subscribe();
     return ()=>{ if(db) void db.removeChannel(channel); };
   }
 },[]);
 return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Live Queue</span><h1>Живая очередь</h1><p>Изменения позиции и статуса приходят в realtime.</p></div></header><div className="content"><div className="results">{queues.slice(0,10).map(q=>{const active=q.queue_entries.filter(e=>['WAITING','CALLED','IN_SERVICE'].includes(e.status));return <section className="card" key={q.id}><div className="toolbar"><div><h2>Очередь СТО</h2><div className="muted">{active.length} автомобилей · режим {q.mode}</div></div><span className="pill">{q.is_open?'Открыта':'Закрыта'}</span></div>{active.map(e=><div className="service-row" key={e.id}><strong>#{e.position}</strong><span>{e.status}</span><span>{e.estimated_wait_minutes??'—'} мин</span></div>)}</section>})}</div></div></main>;
}

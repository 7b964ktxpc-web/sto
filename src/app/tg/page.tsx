'use client';

import { useEffect, useState } from 'react';

type TgWebApp = { ready?:()=>void; expand?:()=>void; initData?:string; close?:()=>void };
declare global { interface Window { Telegram?: { WebApp?: TgWebApp } } }

export default function TelegramMiniApp(){
 const [active,setActive]=useState('home'); const [queue,setQueue]=useState({position:2,wait:35}); const [authState,setAuthState]=useState<'loading'|'authenticated'|'standalone'|'error'>('loading');
 const [authError,setAuthError]=useState('');
 useEffect(()=>{
   const webApp=window.Telegram?.WebApp;
   webApp?.ready?.(); webApp?.expand?.();
   const initData=webApp?.initData;
   if(!initData){setAuthState('standalone');return;}
   fetch('/api/telegram/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData})})
     .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'Не удалось войти через Telegram');setAuthState('authenticated');})
     .catch(error=>{setAuthState('error');setAuthError(error instanceof Error?error.message:'Ошибка Telegram авторизации');});
 },[]);
 const nav=[['home','Главная'],['search','Найти СТО'],['bookings','Записи'],['cars','Автомобили'],['profile','Профиль']];
 return <main className="content" style={{maxWidth:620}}><section className="hero" style={{borderRadius:20,marginBottom:14}}><div className="hero-inner"><span className="eyebrow">Telegram Mini App</span><h1 style={{fontSize:42,marginBottom:8}}>🚗 STO NSK</h1><p>Запись в автосервис прямо внутри Telegram.</p><div style={{marginTop:10}}><span className="pill">{authState==='loading'?'Авторизация…':authState==='authenticated'?'Telegram подключён':authState==='standalone'?'Открыто вне Telegram':'Ошибка авторизации'}</span></div>{authState==='error'&&<div className="muted" style={{marginTop:8}}>{authError}</div>}</div></section>
 <div className="card"><h2>{active==='home'?'Что нужно сделать?':nav.find(x=>x[0]===active)?.[1]}</h2>{active==='home'&&<><div className="search" style={{gridTemplateColumns:'1fr auto',margin:'14px 0'}}><input placeholder="Например: замена масла"/><button className="primary" onClick={()=>setActive('search')}>Найти</button></div><div className="feature-grid"><div className="feature"><strong>Ближайшая запись</strong><span className="muted">Сегодня · 14:30 · AutoMaster</span></div><div className="feature"><strong>Живая очередь</strong><span className="muted">Перед вами {queue.position-1} автомобиля · ~{queue.wait} мин</span></div></div></>}
 {active==='search'&&<><div className="feature-grid">{['AutoMaster','Garage NSK','Drive Service'].map(n=><button className="feature" key={n} onClick={()=>setActive('bookings')}><strong>{n}</strong><span className="muted">★ 4.8 · есть слоты сегодня</span></button>)}</div></>}
 {active==='bookings'&&<div className="feature-grid"><div className="feature"><strong>Сегодня · 14:30</strong><span className="muted">AutoMaster · Замена масла</span><span className="pill" style={{marginTop:8}}>Подтверждено</span></div><div className="feature"><strong>Текущая очередь</strong><span className="muted">Перед вами {queue.position-1}</span><button className="primary" style={{marginTop:10}} onClick={()=>setQueue(q=>({...q,position:Math.max(1,q.position-1),wait:Math.max(10,q.wait-10)}))}>Обновить очередь</button></div></div>}
 {active==='cars'&&<div className="feature-grid"><div className="feature"><strong>Toyota Camry</strong><span className="muted">2019 · А123ВС54 · 78 400 км</span></div><div className="feature"><strong>Добавить автомобиль</strong><span className="muted">Марка, модель, госномер и пробег.</span></div></div>}
 {active==='profile'&&<div className="feature-grid"><div className="feature"><strong>Telegram</strong><span className="muted">{authState==='authenticated'?'Сессия активна.':'Авторизация через initData.'}</span></div><div className="feature"><strong>Уведомления</strong><span className="muted">Запись, напоминания, очередь и готовность автомобиля.</span></div></div>}
 </div>
 <nav style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,marginTop:12}}>{nav.map(([key,label])=><button key={key} className={active===key?'primary':'pill'} onClick={()=>setActive(key)} style={{minHeight:48}}>{label}</button>)}</nav></main>
}

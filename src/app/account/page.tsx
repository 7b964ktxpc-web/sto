'use client';

import { useEffect, useState } from 'react';

type Car={id:string;brand:string;model:string;year:number|null;plate_number:string|null;mileage:number|null};
type Appointment={id:string;starts_at:string;ends_at:string;status:string;business:{name:string};service:{price:number;duration_minutes:number;service:{name:string}};car:{brand:string;model:string;plate_number:string|null}};

const statusLabel:Record<string,string>={PENDING:'Ожидает подтверждения',CONFIRMED:'Подтверждена',ARRIVED:'Клиент прибыл',IN_SERVICE:'Автомобиль в работе',READY:'Готов',COMPLETED:'Завершена',CANCELLED:'Отменена',NO_SHOW:'Неявка'};

export default function AccountPage(){
 const [user,setUser]=useState<any>(null),[cars,setCars]=useState<Car[]>([]),[appointments,setAppointments]=useState<Appointment[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [brand,setBrand]=useState(''),[model,setModel]=useState(''),[plate,setPlate]=useState('');
 const [saving,setSaving]=useState(false);
 const load=async()=>{
   setLoading(true); setError('');
   const me=await fetch('/api/me');
   if(!me.ok){setError('Войдите, чтобы открыть кабинет клиента.');setLoading(false);return;}
   const mx=await me.json();setUser(mx.user);
   const [cx,ax]=await Promise.all([fetch('/api/me/cars'),fetch('/api/me/appointments')]);
   const [cj,aj]=await Promise.all([cx.json(),ax.json()]);
   if(!cx.ok||!ax.ok) setError('Не удалось загрузить кабинет.');
   setCars(cj.cars??[]);setAppointments(aj.appointments??[]);setLoading(false);
 };
 useEffect(()=>{void load()},[]);
 const addCar=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);const r=await fetch('/api/me/cars',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({brand,model,plate_number:plate})});if(r.ok){setBrand('');setModel('');setPlate('');await load()}else setError('Не удалось добавить автомобиль.');setSaving(false)};
 const cancel=async(id:string)=>{const r=await fetch(`/api/me/appointments/${id}/cancel`,{method:'POST'});if(r.ok) await load(); else setError('Это время уже нельзя отменить.');};
 if(loading)return <main className="page"><div className="content"><div className="card">Загружаем кабинет…</div></div></main>;
 if(!user)return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Кабинет</span><h1>Личный кабинет</h1><p>{error}</p></div></header><div className="content"><div className="card empty"><strong>Авторизация нужна для доступа</strong><div className="muted">Здесь будут ваши автомобили, записи, история и уведомления.</div></div></div></main>;
 return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Личный кабинет</span><h1>{user.display_name||'Ваш кабинет'}</h1><p>{user.phone||user.email||'Управляйте автомобилями и записями в одном месте.'}</p></div></header><div className="content"><div className="layout"><section className="results"><div className="card"><div className="toolbar"><div><h2>Ближайшие записи</h2><div className="muted">{appointments.length} записей в истории</div></div><span className="pill">Мои записи</span></div>{appointments.length===0?<div className="empty"><strong>Записей пока нет</strong><div className="muted">Найдите СТО и выберите свободное время.</div></div>:appointments.map(a=><div className="service-row" key={a.id}><div><strong>{a.business?.name}</strong><div className="muted">{a.service?.service?.name} · {a.car?.brand} {a.car?.model}</div><div className="muted">{new Date(a.starts_at).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'})}</div></div><div style={{textAlign:'right'}}><div className="pill">{statusLabel[a.status]||a.status}</div>{['PENDING','CONFIRMED'].includes(a.status)&&<button className="pill" style={{marginTop:8,cursor:'pointer'}} onClick={()=>cancel(a.id)}>Отменить</button>}</div></div>)}</div>
 <div className="card"><div className="toolbar"><div><h2>Мои автомобили</h2><div className="muted">Сохраняйте данные, чтобы записываться быстрее.</div></div><span className="pill">{cars.length}</span></div>{cars.map(c=><div className="service-row" key={c.id}><div><strong>{c.brand} {c.model}</strong><div className="muted">{c.plate_number||'Госномер не указан'} · {c.year||'год не указан'}</div></div><span className="pill">{c.mileage?`${c.mileage.toLocaleString('ru-RU')} км`:'Пробег —'}</span></div>)}<form onSubmit={addCar} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:8,marginTop:14}}><input placeholder="Марка" value={brand} onChange={e=>setBrand(e.target.value)} required/><input placeholder="Модель" value={model} onChange={e=>setModel(e.target.value)} required/><input placeholder="Госномер" value={plate} onChange={e=>setPlate(e.target.value)}/><button className="primary" disabled={saving}>{saving?'…':'Добавить'}</button></form></div></section><aside className="card"><span className="pill">Быстрые действия</span><h2 style={{marginTop:12}}>Записаться в СТО</h2><p className="muted">Найдите сервис, выберите услугу и свободное время.</p><a className="primary" style={{display:'inline-block',textDecoration:'none'}} href="/marketplace">Найти СТО</a><div className="section"><div className="feature"><strong>Telegram</strong><span className="muted">Подтверждения и напоминания будут доступны после привязки Telegram.</span></div><div className="feature" style={{marginTop:10}}><strong>Живая очередь</strong><span className="muted">Следите за позицией автомобиля в реальном времени.</span></div></div></aside></div></div></main>;
}

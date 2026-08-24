'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Hour = { id?: string; weekday: number; starts_at: string; ends_at: string; break_starts_at?: string | null; break_ends_at?: string | null };
type Exception = { id?: string; exception_date: string; is_closed: boolean; starts_at?: string | null; ends_at?: string | null; reason?: string | null };

const days = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
const defaultHours = days.map((_, i) => ({ weekday: (i + 1) % 7, starts_at: '09:00', ends_at: '20:00', break_starts_at: null, break_ends_at: null }));

export default function BusinessSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [hours, setHours] = useState<Hour[]>(defaultHours);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [closedDays, setClosedDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/businesses/detail?id=${encodeURIComponent(id)}`).then(async r => { const x = await r.json(); if (r.status === 403) { router.replace('/admin/login'); return null; } return x; }),
      fetch(`/api/admin/businesses/schedule?businessId=${encodeURIComponent(id)}`).then(async r => { const x = await r.json(); if (r.status === 403) { router.replace('/admin/login'); return null; } if (!r.ok) throw new Error(x.error); return x; }),
    ]).then(([detail, schedule]) => {
      if (detail?.business) setBusinessName(detail.business.name);
      if (schedule) {
        setHours((schedule.hours ?? []).length ? schedule.hours.map((h:any) => ({ ...h, starts_at: String(h.starts_at).slice(0,5), ends_at: String(h.ends_at).slice(0,5), break_starts_at: h.break_starts_at ? String(h.break_starts_at).slice(0,5) : null, break_ends_at: h.break_ends_at ? String(h.break_ends_at).slice(0,5) : null })) : defaultHours);
        setExceptions((schedule.exceptions ?? []).map((e:any) => ({ ...e, starts_at: e.starts_at ? String(e.starts_at).slice(0,5) : null, ends_at: e.ends_at ? String(e.ends_at).slice(0,5) : null })));
      }
    }).catch(() => setError('Не удалось загрузить расписание.')).finally(() => setLoading(false));
  }, [id, router]);

  const save = async () => {
    setSaving(true); setMessage(''); setError('');
    try {
      const payload = { businessId: id, hours: hours.filter(h => !closedDays.includes(h.weekday)), exceptions };
      const r = await fetch('/api/admin/businesses/schedule', { method:'PUT', headers:{'content-type':'application/json'}, body: JSON.stringify(payload) });
      const x = await r.json();
      if (r.status === 403) { router.replace('/admin/login'); return; }
      if (!r.ok) throw new Error(x.error || 'SAVE_FAILED');
      setMessage('Расписание сохранено и записано в аудит.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить расписание.'); }
    finally { setSaving(false); }
  };

  const addException = () => setExceptions(v => [...v, { exception_date: new Date().toISOString().slice(0,10), is_closed: true, starts_at: null, ends_at: null, reason: '' }]);
  const weekdayMap = useMemo(() => new Map(hours.map(h => [h.weekday, h])), [hours]);

  if (loading) return <main className="content"><div className="card">Загружаем расписание…</div></main>;
  return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Admin</span><h1>Расписание</h1><p>{businessName || 'СТО'} · рабочие часы и исключения</p></div></header><div className="content">
    <div className="toolbar"><a className="pill" href={`/admin/businesses/${id}`}>← Карточка СТО</a><button className="primary" onClick={() => void save()} disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить расписание'}</button></div>
    {message && <div className="card" style={{marginTop:12}}>{message}</div>}
    {error && <div className="card error" style={{marginTop:12}}>{error}</div>}
    <section className="card" style={{marginTop:16}}><div className="toolbar"><div><h2>Рабочие часы</h2><div className="muted">0 — воскресенье, 1 — понедельник и т.д.</div></div></div>
      <div style={{display:'grid',gap:10}}>{days.map((day, idx) => { const weekday=(idx+1)%7; const h=weekdayMap.get(weekday) ?? {weekday,starts_at:'09:00',ends_at:'20:00',break_starts_at:null,break_ends_at:null}; const closed=closedDays.includes(weekday); return <div key={weekday} className="day-row"><label className="check"><input type="checkbox" checked={!closed} onChange={e=>setClosedDays(v=>e.target.checked?v.filter(x=>x!==weekday):[...v,weekday])}/><strong>{day}</strong></label><div className="times"><input type="time" disabled={closed} value={h.starts_at} onChange={e=>setHours(v=>v.map(x=>x.weekday===weekday?{...x,starts_at:e.target.value}:x))}/><span>—</span><input type="time" disabled={closed} value={h.ends_at} onChange={e=>setHours(v=>v.map(x=>x.weekday===weekday?{...x,ends_at:e.target.value}:x))}/><input type="time" disabled={closed} value={h.break_starts_at||''} onChange={e=>setHours(v=>v.map(x=>x.weekday===weekday?{...x,break_starts_at:e.target.value||null}:x))}/><input type="time" disabled={closed} value={h.break_ends_at||''} onChange={e=>setHours(v=>v.map(x=>x.weekday===weekday?{...x,break_ends_at:e.target.value||null}:x))}/></div></div>})}</div>
      <div className="muted" style={{marginTop:10,fontSize:12}}>Последние два поля — начало и конец перерыва.</div>
    </section>
    <section className="card" style={{marginTop:16}}><div className="toolbar"><div><h2>Исключения и закрытия</h2><div className="muted">Праздники, технические работы и разовые изменения</div></div><button className="pill" onClick={addException}>+ Добавить</button></div>
      {exceptions.length===0 ? <div className="empty">Исключений пока нет.</div> : <div style={{display:'grid',gap:10}}>{exceptions.map((e,i)=><div className="exception" key={`${e.exception_date}-${i}`}><input type="date" value={e.exception_date} onChange={ev=>setExceptions(v=>v.map((x,j)=>j===i?{...x,exception_date:ev.target.value}:x))}/><select value={e.is_closed?'closed':'custom'} onChange={ev=>setExceptions(v=>v.map((x,j)=>j===i?{...x,is_closed:ev.target.value==='closed'}:x))}><option value="closed">Закрыто</option><option value="custom">Особый график</option></select>{!e.is_closed&&<><input type="time" value={e.starts_at||''} onChange={ev=>setExceptions(v=>v.map((x,j)=>j===i?{...x,starts_at:ev.target.value}:x))}/><input type="time" value={e.ends_at||''} onChange={ev=>setExceptions(v=>v.map((x,j)=>j===i?{...x,ends_at:ev.target.value}:x))}/></>}<input placeholder="Причина" value={e.reason||''} onChange={ev=>setExceptions(v=>v.map((x,j)=>j===i?{...x,reason:ev.target.value}:x))}/><button className="pill" onClick={()=>setExceptions(v=>v.filter((_,j)=>j!==i))}>Удалить</button></div>)}</div>}
    </section>
  </div><style jsx>{`.day-row{display:grid;grid-template-columns:190px minmax(0,1fr);gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06)}.check{display:flex;gap:8px;align-items:center}.times{display:grid;grid-template-columns:1fr auto 1fr 1fr 1fr;gap:8px;align-items:center}.exception{display:grid;grid-template-columns:150px 150px 110px 110px minmax(180px,1fr) auto;gap:8px;align-items:center}.day-row input,.exception input,.exception select{box-sizing:border-box;width:100%;padding:9px 10px;border:1px solid rgba(0,0,0,.12);border-radius:9px;background:#fff;font:inherit}@media(max-width:800px){.day-row{grid-template-columns:1fr}.times{grid-template-columns:1fr auto 1fr}.times input:nth-of-type(n+3){grid-column:span 1}.exception{grid-template-columns:1fr 1fr}.exception input:nth-of-type(5){grid-column:1/-1}}`}</style></main>;
}

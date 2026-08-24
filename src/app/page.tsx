'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
const CityMap = dynamic(() => import('@/components/CityMap'), { ssr: false });

type Service = { id: string; name: string };
type Slot = { slot_start: string; slot_end: string; available_workstations: number };
type Station = { id: string; name: string; address: string; rating: number; lat: number; lng: number; phone?: string; station_services: Array<{ id: string; service_id: string; price: number; duration_minutes: number; services: Service | null }> };

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Novosibirsk' }).format(new Date());

export default function Home() {
  const [stations, setStations] = useState<Station[]>([]);
  const [query, setQuery] = useState('');
  const [service, setService] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Station | null>(null);
  const [selectedService, setSelectedService] = useState('');
  const [bookingDate, setBookingDate] = useState(today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stations${service ? `?service=${encodeURIComponent(service)}` : ''}`)
      .then(async r => { const x = await r.json(); if (!r.ok) throw new Error(x.error); return x; })
      .then(x => setStations(x.stations ?? []))
      .catch(() => setError('Не удалось загрузить СТО. Попробуйте ещё раз.'))
      .finally(() => setLoading(false));
  }, [service]);

  const services = useMemo(() => Array.from(new Map(stations.flatMap(s => s.station_services).filter(x => x.services).map(x => [x.services!.id, x.services!])).values()), [stations]);
  const filtered = useMemo(() => stations.filter(s => !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.address.toLowerCase().includes(query.toLowerCase()) || s.station_services.some(x => x.services?.name.toLowerCase().includes(query.toLowerCase()))), [stations, query]);

  async function loadSlots(station: Station, businessServiceId: string, date: string) {
    setSlotsLoading(true); setSlots([]); setSelectedSlot('');
    try {
      const r = await fetch(`/api/availability?businessId=${station.id}&businessServiceId=${businessServiceId}&date=${date}`);
      const x = await r.json(); if (!r.ok) throw new Error(x.error);
      setSlots(x.slots ?? []);
    } catch { setError('Не удалось загрузить слоты. Попробуйте выбрать другую дату.'); }
    finally { setSlotsLoading(false); }
  }

  function openBooking(station: Station) {
    const firstService = station.station_services[0]?.id ?? '';
    setSelected(station); setSelectedService(firstService); setBookingDate(today); loadSlots(station, firstService, today);
  }

  return <main className="page">
    <header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Новосибирск</span><h1>Найдите СТО и запишитесь без звонков</h1><p>Сравните цену, рейтинг и свободное время. Запись занимает меньше минуты.</p></div></header>
    <div className="content">
      <div className="search"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="СТО, услуга или район" aria-label="Поиск СТО" /><select value={service} onChange={e => setService(e.target.value)} aria-label="Услуга"><option value="">Все услуги</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button onClick={() => setQuery(query.trim())}>Найти</button></div>
      <div className="toolbar"><div><h2>СТО рядом</h2><div className="muted">{loading ? 'Загружаем актуальные предложения…' : `${filtered.length} сервисов доступно`}</div></div><span className="pill">Список + карта</span></div>
      <div className="layout">
        <section className="results">
          {error && <div className="card error">{error}</div>}
          {!loading && !error && filtered.length === 0 && <div className="card empty"><strong>Ничего не нашли</strong><div className="muted">Попробуйте другую услугу или название СТО.</div></div>}
          {loading && <div className="card">Загружаем сервисы…</div>}
          {filtered.map(s => <article className="card" key={s.id}><div className="status green">● Есть свободные посты</div><h2>{s.name}</h2><div className="muted">{s.address}</div><div style={{display:'flex',gap:14,margin:'10px 0 4px'}}><span className="rating">★ {s.rating || 0}</span><span className="muted">Новосибирск</span></div>{s.station_services.slice(0, 3).map(x => <div className="service-row" key={x.id}><span>{x.services?.name ?? 'Услуга'} · {x.duration_minutes} мин</span><strong>от {x.price.toLocaleString('ru-RU')} ₽</strong></div>)}<div style={{marginTop:14,display:'flex',gap:8}}><button className="primary" onClick={() => openBooking(s)}>Записаться</button><button className="pill" onClick={() => setSelected(s)}>Подробнее</button></div></article>)}
        </section>
        <section className="map" aria-label="Карта СТО"><CityMap stations={filtered.map(s => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }))}/></section>
      </div>

      {selected && <section className="card booking">
        <div className="toolbar" style={{margin:'0 0 8px'}}><div><span className="pill">Запись в СТО</span><h2>{selected.name}</h2><div className="muted">{selected.address} · ★ {selected.rating || 0}</div></div><button className="pill" onClick={() => setSelected(null)}>Закрыть</button></div>
        <div className="service-row"><select value={selectedService} onChange={e => { const id=e.target.value; setSelectedService(id); loadSlots(selected,id,bookingDate); }} style={{padding:12,borderRadius:10,border:'1px solid #e2e8f0',flex:1}}>{selected.station_services.map(x => <option key={x.id} value={x.id}>{x.services?.name} · {x.price.toLocaleString('ru-RU')} ₽ · {x.duration_minutes} мин</option>)}</select><input type="date" min={today} value={bookingDate} onChange={e => { setBookingDate(e.target.value); loadSlots(selected,selectedService,e.target.value); }} style={{padding:12,borderRadius:10,border:'1px solid #e2e8f0'}} /></div>
        <div className="section"><div className="muted" style={{marginBottom:10}}>Свободное время</div>{slotsLoading ? <div className="card">Проверяем посты и занятые записи…</div> : slots.length ? <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{slots.map(slot => { const label=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Novosibirsk',hour:'2-digit',minute:'2-digit'}).format(new Date(slot.slot_start)); return <button key={slot.slot_start} className={selectedSlot===slot.slot_start ? 'primary' : 'pill'} onClick={()=>setSelectedSlot(slot.slot_start)}>{label} · {slot.available_workstations} пост.</button>; })}</div> : <div className="card empty">На эту дату свободных слотов нет. Выберите другой день.</div>}</div>
        {selectedSlot && <div className="card" style={{marginTop:14,background:'#f8fafc'}}><strong>Слот выбран: {new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Novosibirsk',dateStyle:'medium',timeStyle:'short'}).format(new Date(selectedSlot))}</strong><div className="muted" style={{marginTop:4}}>Для финального подтверждения подключим авторизацию клиента и привяжем запись к автомобилю.</div><button className="primary" style={{marginTop:12}} onClick={()=>alert('Слот зафиксирован в UI. Следующий этап — auth + автомобиль + создание appointment.')}>Продолжить</button></div>}
      </section>}
      <section className="section"><div className="feature-grid"><div className="feature"><strong>Цена до записи</strong><span className="muted">Сравнивайте предложения разных СТО.</span></div><div className="feature"><strong>Реальные слоты</strong><span className="muted">Availability engine учитывает рабочие часы и занятые посты.</span></div><div className="feature"><strong>Живая очередь</strong><span className="muted">Следите за статусом автомобиля в реальном времени.</span></div></div></section>
    </div>
  </main>;
}

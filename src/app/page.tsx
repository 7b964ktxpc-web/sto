'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
const CityMap = dynamic(() => import('@/components/CityMap'), { ssr: false });

type Service = { id: string; name: string };
type Slot = { slot_start: string; slot_end: string; available_workstations: number };
type Car = { id: string; brand: string; model: string; plate_number: string | null };
type Station = { id: string; name: string; address: string; rating: number; lat: number; lng: number; phone?: string; station_services: Array<{ id: string; service_id: string; price: number; duration_minutes: number; services: Service | null }> };
type BookingIntent = { businessId: string; businessServiceId: string; date: string; slotStart: string };

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Novosibirsk' }).format(new Date());
const BOOKING_INTENT_KEY = 'sto_booking_intent';

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
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [error, setError] = useState('');

  async function loadCars() {
    const r = await fetch('/api/me/cars');
    if (!r.ok) { setAuthRequired(true); return false; }
    const x = await r.json();
    setAuthRequired(false);
    setCars(x.cars ?? []);
    if (!selectedCar && x.cars?.[0]) setSelectedCar(x.cars[0].id);
    return true;
  }

  async function loadSlots(station: Station, businessServiceId: string, date: string, preferredSlot = '') {
    setSlotsLoading(true); setSlots([]); setSelectedSlot(''); setBookingSuccess(''); setError('');
    try {
      const r = await fetch(`/api/availability?businessId=${station.id}&businessServiceId=${businessServiceId}&date=${date}`);
      const x = await r.json(); if (!r.ok) throw new Error(x.error);
      const nextSlots = x.slots ?? [];
      setSlots(nextSlots);
      if (preferredSlot && nextSlots.some((slot: Slot) => slot.slot_start === preferredSlot)) setSelectedSlot(preferredSlot);
    } catch { setError('Не удалось загрузить слоты. Попробуйте выбрать другую дату.'); }
    finally { setSlotsLoading(false); }
  }

  async function openBooking(station: Station) {
    const businessServiceId = station.station_services[0]?.id ?? '';
    localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId: station.id, businessServiceId, date: today, slotStart: '' }));
    setSelected(station); setSelectedService(businessServiceId); setBookingDate(today); setSelectedSlot(''); setBookingSuccess(''); setAuthRequired(false); setError('');
    await loadCars();
    if (businessServiceId) await loadSlots(station, businessServiceId, today);
  }

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stations${service ? `?service=${encodeURIComponent(service)}` : ''}`)
      .then(async r => { const x = await r.json(); if (!r.ok) throw new Error(x.error); return x; })
      .then(async x => {
        const nextStations = x.stations ?? [];
        setStations(nextStations);
        const raw = localStorage.getItem(BOOKING_INTENT_KEY);
        if (raw) {
          try {
            const intent = JSON.parse(raw) as BookingIntent;
            const station = nextStations.find((item: Station) => item.id === intent.businessId);
            if (station && station.station_services.some(item => item.id === intent.businessServiceId)) {
              setSelected(station);
              setSelectedService(intent.businessServiceId);
              setBookingDate(intent.date);
              setSelectedSlot(intent.slotStart || '');
              await loadCars();
              await loadSlots(station, intent.businessServiceId, intent.date, intent.slotStart);
            }
          } catch { localStorage.removeItem(BOOKING_INTENT_KEY); }
        }
      })
      .catch(() => setError('Не удалось загрузить СТО. Попробуйте ещё раз.'))
      .finally(() => setLoading(false));
  }, [service]);

  const services = useMemo(() => Array.from(new Map(stations.flatMap(s => s.station_services).filter(x => x.services).map(x => [x.services!.id, x.services!])).values()), [stations]);
  const filtered = useMemo(() => stations.filter(s => !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.address.toLowerCase().includes(query.toLowerCase()) || s.station_services.some(x => x.services?.name.toLowerCase().includes(query.toLowerCase()))), [stations, query]);

  async function confirmBooking() {
    if (!selected || !selectedService || !selectedSlot) return;
    if (!selectedCar) { setError('Добавьте автомобиль в кабинете клиента.'); return; }
    setBookingBusy(true); setError(''); setBookingSuccess('');
    const r = await fetch('/api/me/appointments', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ business_service_id:selectedService, car_id:selectedCar, starts_at:selectedSlot }) });
    const x = await r.json();
    setBookingBusy(false);
    if (r.status === 401) { localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId: selected.id, businessServiceId: selectedService, date: bookingDate, slotStart: selectedSlot })); setAuthRequired(true); return; }
    if (!r.ok) { setError(x.error || 'Не удалось создать запись.'); return; }
    localStorage.removeItem(BOOKING_INTENT_KEY);
    setBookingSuccess('Запись создана. Проверьте статус и детали в личном кабинете.');
  }

  return <main className="page">
    <header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Новосибирск</span><h1>Найдите СТО и запишитесь без звонков</h1><p>Сравните цену, рейтинг и свободное время. Запись занимает меньше минуты.</p></div></header>
    <div className="content">
      <div className="search"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="СТО, услуга или район" aria-label="Поиск СТО" /><select value={service} onChange={e => setService(e.target.value)} aria-label="Услуга"><option value="">Все услуги</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button onClick={() => setQuery(query.trim())}>Найти</button></div>
      <div className="toolbar"><div><h2>СТО рядом</h2><div className="muted">{loading ? 'Загружаем актуальные предложения…' : `${filtered.length} сервисов доступно`}</div></div><span className="pill">Список + карта</span></div>
      <div className="layout">
        <section className="results">
          {error && !selected && <div className="card error">{error}</div>}
          {!loading && !error && filtered.length === 0 && <div className="card empty"><strong>Ничего не нашли</strong><div className="muted">Попробуйте другую услугу или название СТО.</div></div>}
          {loading && <div className="card">Загружаем сервисы…</div>}
          {filtered.map(s => <article className="card" key={s.id}><div className="status green">● Есть свободные посты</div><h2>{s.name}</h2><div className="muted">{s.address}</div><div style={{display:'flex',gap:14,margin:'10px 0 4px'}}><span className="rating">★ {s.rating || 0}</span><span className="muted">Новосибирск</span></div>{s.station_services.slice(0, 3).map(x => <div className="service-row" key={x.id}><span>{x.services?.name ?? 'Услуга'} · {x.duration_minutes} мин</span><strong>от {x.price.toLocaleString('ru-RU')} ₽</strong></div>)}<div style={{marginTop:14,display:'flex',gap:8}}><button className="primary" onClick={() => void openBooking(s)}>Записаться</button><button className="pill" onClick={() => setSelected(s)}>Подробнее</button></div></article>)}
        </section>
        <section className="map" aria-label="Карта СТО"><CityMap stations={filtered.map(s => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }))}/></section>
      </div>

      {selected && <section className="card booking">
        <div className="toolbar" style={{margin:'0 0 8px'}}><div><span className="pill">Запись в СТО</span><h2>{selected.name}</h2><div className="muted">{selected.address} · ★ {selected.rating || 0}</div></div><button className="pill" onClick={() => setSelected(null)}>Закрыть</button></div>
        {authRequired && <div className="card" style={{marginBottom:12,background:'#fff7ed'}}><strong>Нужна авторизация</strong><div className="muted" style={{marginTop:4}}>Войдите в кабинет, добавьте автомобиль и вернитесь к бронированию.</div><a href="/auth?returnTo=/marketplace" className="primary" style={{display:'inline-block',textDecoration:'none',marginTop:10}}>Войти и продолжить</a></div>}
        {error && selected && !slotsLoading && <div className="card error" style={{marginBottom:12}}>{error}</div>}
        <div className="service-row"><select value={selectedService} onChange={e => { const id=e.target.value; setSelectedService(id); localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId:selected.id, businessServiceId:id, date:bookingDate, slotStart:'' })); loadSlots(selected,id,bookingDate); }} style={{padding:12,borderRadius:10,border:'1px solid #e2e8f0',flex:1}}>{selected.station_services.map(x => <option key={x.id} value={x.id}>{x.services?.name} · {x.price.toLocaleString('ru-RU')} ₽ · {x.duration_minutes} мин</option>)}</select><input type="date" min={today} value={bookingDate} onChange={e => { const date=e.target.value; setBookingDate(date); localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId:selected.id, businessServiceId:selectedService, date, slotStart:'' })); loadSlots(selected,selectedService,date); }} style={{padding:12,borderRadius:10,border:'1px solid #e2e8f0'}} /></div>
        {!authRequired && cars.length > 0 && <div className="section"><div className="muted" style={{marginBottom:8}}>Автомобиль</div><select value={selectedCar} onChange={e=>setSelectedCar(e.target.value)} style={{width:'100%',padding:12,borderRadius:10,border:'1px solid #e2e8f0'}}>{cars.map(c=><option key={c.id} value={c.id}>{c.brand} {c.model}{c.plate_number?` · ${c.plate_number}`:''}</option>)}</select></div>}
        <div className="section"><div className="muted" style={{marginBottom:10}}>Свободное время</div>{slotsLoading ? <div className="card">Проверяем посты и занятые записи…</div> : slots.length ? <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{slots.map(slot => { const label=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Novosibirsk',hour:'2-digit',minute:'2-digit'}).format(new Date(slot.slot_start)); return <button key={slot.slot_start} className={selectedSlot===slot.slot_start ? 'primary' : 'pill'} onClick={()=>{setSelectedSlot(slot.slot_start); localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId:selected.id, businessServiceId:selectedService, date:bookingDate, slotStart:slot.slot_start }));}}>{label} · {slot.available_workstations} пост.</button>; })}</div> : <div className="card empty">На эту дату свободных слотов нет. Выберите другой день.</div>}</div>
        {selectedSlot && !authRequired && <div className="card" style={{marginTop:14,background:'#f8fafc'}}><strong>Слот выбран: {new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Novosibirsk',dateStyle:'medium',timeStyle:'short'}).format(new Date(selectedSlot))}</strong><div className="muted" style={{marginTop:4}}>Пост будет назначен автоматически при подтверждении.</div><button className="primary" style={{marginTop:12}} disabled={bookingBusy||!cars.length} onClick={()=>void confirmBooking()}>{bookingBusy?'Создаём запись…':'Подтвердить запись'}</button></div>}
        {bookingSuccess && <div className="card" style={{marginTop:12}}><strong>{bookingSuccess}</strong><div style={{marginTop:8}}><a href="/account" className="primary" style={{display:'inline-block',textDecoration:'none'}}>Мои записи</a></div></div>}
      </section>}
      <section className="section"><div className="feature-grid"><div className="feature"><strong>Цена до записи</strong><span className="muted">Сравнивайте предложения разных СТО.</span></div><div className="feature"><strong>Реальные слоты</strong><span className="muted">Availability engine учитывает рабочие часы и занятые посты.</span></div><div className="feature"><strong>Живая очередь</strong><span className="muted">Следите за позицией автомобиля в реальном времени.</span></div></div></section>
    </div>
  </main>;
}

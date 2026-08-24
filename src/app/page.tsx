'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
const CityMap = dynamic(() => import('@/components/CityMap'), { ssr: false });

type Service = { id: string; name: string };
type Slot = { slot_start: string; slot_end: string; available_workstations: number };
type Car = { id: string; brand: string; model: string; plate_number: string | null };
type Station = { id: string; name: string; address: string; rating: number; lat: number; lng: number; phone?: string; station_services: Array<{ id: string; service_id: string; price: number; duration_minutes: number; services: Service | null }> };
type BookingIntent = { businessId: string; businessServiceId: string; date: string; slotStart: string };
type BookingResult = { appointment?: { id:string; status:string; starts_at:string; ends_at:string; workstation?: { id:string; name:string }|null; employee?: { id:string; name:string; position:string|null }|null }; resource_assignment?: { workstation_id:string; employee_id:string|null } };

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
  const [bookingResult, setBookingResult] = useState<BookingResult|null>(null);
  const [error, setError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);

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
    setSlotsLoading(true); setSlots([]); setSelectedSlot(''); setBookingResult(null); setError('');
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
    const intent = { businessId: station.id, businessServiceId, date: today, slotStart: '' };
    localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify(intent));
    setSelected(station); setSelectedService(businessServiceId); setBookingDate(today); setSelectedSlot(''); setBookingResult(null); setAuthRequired(false); setError('');
    await loadCars();
    if (businessServiceId) await loadSlots(station, businessServiceId, today);
  }

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stations${service ? `?service=${encodeURIComponent(service)}` : ''}`)
      .then(async r => { const x = await r.json(); if (!r.ok) throw new Error(x.error); return x; })
      .then(async x => {
        const nextStations = (x.stations ?? []) as Station[];
        setStations(nextStations);
        const raw = localStorage.getItem(BOOKING_INTENT_KEY);
        if (raw) {
          try {
            const intent = JSON.parse(raw) as BookingIntent;
            const station = nextStations.find((item: Station) => item.id === intent.businessId);
            if (station && station.station_services.some((item) => item.id === intent.businessServiceId)) {
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
    setBookingBusy(true); setError(''); setBookingResult(null);
    const r = await fetch('/api/me/appointments', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ business_service_id:selectedService, car_id:selectedCar, starts_at:selectedSlot }) });
    const x = await r.json() as BookingResult & {error?:string};
    setBookingBusy(false);
    if (r.status === 401) { localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId: selected.id, businessServiceId: selectedService, date: bookingDate, slotStart: selectedSlot })); setAuthRequired(true); return; }
    if (!r.ok) { setError(x.error || 'Не удалось создать запись.'); return; }
    localStorage.removeItem(BOOKING_INTENT_KEY);
    setBookingResult(x);
  }

  return <main className="page">
    <header className="hero">
      <div className="hero-inner">
        <div className="location-pill">⌖ Новосибирск <span>⌄</span></div>
        <h1>Найдите СТО и запишитесь без звонков</h1>
        <p>Сравните цену, рейтинг и свободное время. Запись занимает меньше минуты.</p>
      </div>
    </header>

    <div className="content">
      <div className="search-wrap">
        <div className="search-main">
          <span className="search-icon">⌕</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="СТО, услуга или район" aria-label="Поиск СТО" />
          <button className="filter-btn" onClick={() => setFilterOpen(v => !v)} aria-label="Фильтр">☷</button>
        </div>
        {filterOpen && <div className="filter-row"><select value={service} onChange={e => setService(e.target.value)} aria-label="Услуга"><option value="">Все услуги</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button className="primary compact" onClick={() => setFilterOpen(false)}>Применить</button></div>}
      </div>

      <div className="view-switch"><button className={!showMap ? 'active' : ''} onClick={() => setShowMap(false)}>Список</button><button className={showMap ? 'active' : ''} onClick={() => setShowMap(true)}>Карта</button></div>

      <div className="toolbar-row"><div><h2>СТО рядом</h2><div className="muted">{loading ? 'Загружаем актуальные предложения…' : `${filtered.length} сервисов доступно`}</div></div><select className="sort-select" defaultValue="near"><option value="near">Сначала ближайшие</option><option value="rating">Лучший рейтинг</option><option value="price">Сначала дешевле</option></select></div>

      {!showMap ? <section className="results">
        {error && !selected && <div className="card error">{error}</div>}
        {!loading && !error && filtered.length === 0 && <div className="card empty"><strong>Ничего не нашли</strong><div className="muted">Попробуйте другую услугу или название СТО.</div></div>}
        {loading && <div className="card">Загружаем сервисы…</div>}
        {filtered.map(s => <article className="station-card" key={s.id}><div className="station-top"><div className="status green">● Открыто</div><button className="icon-btn" aria-label="Избранное">♡</button></div><div className="station-body"><div className="station-placeholder" aria-hidden="true">🚗</div><div className="station-info"><h3>{s.name}</h3><div className="muted">{s.address}</div><div className="station-meta"><span className="rating">★ {s.rating || 0}</span><span className="muted">Новосибирск</span></div><div className="station-tags">{s.station_services.slice(0, 3).map(x => <span key={x.id}>{x.services?.name ?? 'Услуга'}</span>)}</div></div></div><div className="station-bottom"><div><span className="muted small">от</span> <strong>{Math.min(...s.station_services.map(x => x.price), 0).toLocaleString('ru-RU')} ₽</strong></div><button className="primary" onClick={() => void openBooking(s)}>Записаться</button></div></article>)}
      </section> : <section className="map-large"><CityMap stations={filtered.map(s => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }))}/></section>}

      <section className="feature-grid"><div className="feature"><strong>Цена до записи</strong><span className="muted">Сравнивайте предложения разных СТО.</span></div><div className="feature"><strong>Реальные слоты</strong><span className="muted">Учитываем рабочие часы и занятые посты.</span></div><div className="feature"><strong>Живая очередь</strong><span className="muted">Следите за позицией автомобиля.</span></div></section>
    </div>

    {selected && <div className="booking-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}>
      <section className="booking-sheet" role="dialog" aria-modal="true" aria-label="Запись в СТО">
        <div className="sheet-handle" /><div className="sheet-head"><div><span className="pill">Запись в СТО</span><h2>{selected.name}</h2><div className="muted">{selected.address} · ★ {selected.rating || 0}</div></div><button className="icon-btn close" onClick={() => setSelected(null)} aria-label="Закрыть">×</button></div>
        {authRequired && <div className="auth-card"><strong>Сначала войдите</strong><div className="muted">После входа мы вернём вас сюда с выбранными данными.</div><a href="/auth?returnTo=/marketplace" className="primary">Войти и продолжить</a></div>}
        {error && <div className="card error">{error}</div>}
        <div className="booking-block"><div className="section-title">Выберите услугу</div><div className="service-options">{selected.station_services.map(x => <button key={x.id} className={selectedService===x.id ? 'service-option selected' : 'service-option'} onClick={() => { setSelectedService(x.id); setSelectedSlot(''); setBookingResult(null); loadSlots(selected,x.id,bookingDate); localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId:selected.id, businessServiceId:x.id, date:bookingDate, slotStart:'' })); }}><span><strong>{x.services?.name ?? 'Услуга'}</strong><small>{x.duration_minutes} мин · от {x.price.toLocaleString('ru-RU')} ₽</small></span><span className="radio-dot" /></button>)}</div></div>
        <div className="booking-block"><div className="section-title">Выберите дату</div><div className="date-row">{[0,1,2,3].map(offset => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate()+offset); const value = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Novosibirsk'}).format(d); const label = offset===0?'Сегодня':offset===1?'Завтра':new Intl.DateTimeFormat('ru-RU',{weekday:'short',day:'2-digit',month:'short',timeZone:'Asia/Novosibirsk'}).format(d); return <button key={value} className={bookingDate===value?'date-chip selected':'date-chip'} onClick={() => { setBookingDate(value); setSelectedSlot(''); loadSlots(selected,selectedService,value); localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId:selected.id,businessServiceId:selectedService,date:value,slotStart:'' })); }}>{label}<b>{new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',timeZone:'Asia/Novosibirsk'}).format(d)}</b></button>; })}<input className="date-picker" type="date" min={today} value={bookingDate} onChange={e => { const value=e.target.value; setBookingDate(value); setSelectedSlot(''); loadSlots(selected,selectedService,value); }} /></div></div>
        <div className="booking-block"><div className="section-title split"><span>Свободное время</span><small>{slotsLoading?'Обновляем…':'Актуально сейчас'}</small></div>{slotsLoading ? <div className="slots-loading">Проверяем свободные посты…</div> : slots.length ? <div className="slot-grid">{slots.map(slot => { const label=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Novosibirsk',hour:'2-digit',minute:'2-digit'}).format(new Date(slot.slot_start)); return <button key={slot.slot_start} className={selectedSlot===slot.slot_start?'slot-chip selected':'slot-chip'} onClick={() => { setSelectedSlot(slot.slot_start); localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId:selected.id,businessServiceId:selectedService,date:bookingDate,slotStart:slot.slot_start })); }}>{label}</button>; })}</div> : <div className="slots-empty">Свободных слотов на эту дату нет. Выберите другую дату.</div>}</div>
        {!authRequired && !bookingResult && <div className="booking-bottom"><div>{selectedSlot ? <><strong>{new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Novosibirsk',dateStyle:'medium',timeStyle:'short'}).format(new Date(selectedSlot))}</strong><span className="muted">Пост будет назначен автоматически</span></> : <span className="muted">Выберите удобное время</span>}</div><button className="primary confirm" disabled={!selectedSlot||!selectedCar||bookingBusy} onClick={() => void confirmBooking()}>{bookingBusy?'Создаём…':'Записаться'}</button></div>}
        {!authRequired && cars.length===0 && <div className="auth-card compact-auth"><strong>Добавьте автомобиль</strong><div className="muted">Без автомобиля мы не сможем завершить запись.</div><a href="/account" className="secondary-btn">Открыть кабинет</a></div>}
        {bookingResult && <div className="success-card"><div className="status green">● Запись создана</div><h3>Всё готово</h3><div className="muted">{bookingResult.appointment?.starts_at ? new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Novosibirsk',dateStyle:'medium',timeStyle:'short'}).format(new Date(bookingResult.appointment.starts_at)) : 'Запись подтверждена'}</div><a href="/account" className="primary">Мои записи</a></div>}
        {!authRequired && cars.length>0 && <select className="car-select" value={selectedCar} onChange={e=>setSelectedCar(e.target.value)}>{cars.map(c=><option key={c.id} value={c.id}>{c.brand} {c.model}{c.plate_number?` · ${c.plate_number}`:''}</option>)}</select>}
      </section>
    </div>}
  </main>;
}

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { CarFront, Check, ChevronDown, Filter, Heart, Search, Star, X } from 'lucide-react';

const CityMap = dynamic(() => import('@/components/CityMap'), { ssr: false });

type Service = { id: string; name: string };
type Slot = { slot_start: string; slot_end: string; available_workstations: number };
type Car = { id: string; brand: string; model: string; plate_number: string | null };
type Station = {
  id: string;
  name: string;
  address: string;
  rating: number;
  lat: number;
  lng: number;
  phone?: string;
  station_services: Array<{
    id: string;
    service_id: string;
    price: number;
    duration_minutes: number;
    services: Service | null;
  }>;
};
type BookingIntent = { businessId: string; businessServiceId: string; date: string; slotStart: string };
type BookingResult = {
  appointment?: {
    id: string;
    status: string;
    starts_at: string;
    ends_at: string;
    workstation?: { id: string; name: string } | null;
    employee?: { id: string; name: string; position: string | null } | null;
  };
};

type FavoriteRow = { business_id: string; business?: { id: string } | null };

const BOOKING_INTENT_KEY = 'sto_booking_intent';
const TZ = 'Asia/Novosibirsk';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

function formatTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
}

function nextDates() {
  return [0, 1, 2, 3].map(offset => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() + offset);
    const value = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
    const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: TZ }).format(date).replace('.', '');
    return {
      value,
      title: offset === 0 ? 'Сегодня' : offset === 1 ? 'Завтра' : weekday,
      sub: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', timeZone: TZ }).format(date),
    };
  });
}

export default function Home() {
  const [stations, setStations] = useState<Station[]>([]);
  const [query, setQuery] = useState('');
  const [service, setService] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
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
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteBusy, setFavoriteBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selected]);

  useEffect(() => {
    fetch('/api/me/favorites')
      .then(async response => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error('favorites');
        return response.json() as Promise<{ favorites?: FavoriteRow[] }>;
      })
      .then(data => {
        if (!data) return;
        setFavorites(new Set((data.favorites ?? []).map(item => item.business_id)));
      })
      .catch(() => {
        // Favorites are non-blocking for the marketplace and should never break the page.
      });
  }, []);

  async function toggleFavorite(businessId: string) {
    if (favoriteBusy.has(businessId)) return;
    setError('');
    setFavoriteBusy(prev => new Set(prev).add(businessId));
    const wasFavorite = favorites.has(businessId);
    setFavorites(prev => {
      const next = new Set(prev);
      wasFavorite ? next.delete(businessId) : next.add(businessId);
      return next;
    });
    try {
      const response = wasFavorite
        ? await fetch(`/api/me/favorites?business_id=${encodeURIComponent(businessId)}`, { method: 'DELETE' })
        : await fetch('/api/me/favorites', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ business_id: businessId }),
          });
      if (response.status === 401) {
        setFavorites(prev => {
          const next = new Set(prev);
          wasFavorite ? next.add(businessId) : next.delete(businessId);
          return next;
        });
        setError('Войдите, чтобы сохранять СТО в избранное.');
      } else if (!response.ok) {
        throw new Error('favorite');
      }
    } catch {
      setFavorites(prev => {
        const next = new Set(prev);
        wasFavorite ? next.add(businessId) : next.delete(businessId);
        return next;
      });
      setError('Не удалось обновить избранное. Попробуйте ещё раз.');
    } finally {
      setFavoriteBusy(prev => {
        const next = new Set(prev);
        next.delete(businessId);
        return next;
      });
    }
  }

  async function loadCars() {
    const r = await fetch('/api/me/cars');
    if (!r.ok) {
      setAuthRequired(true);
      return null;
    }
    const x = await r.json();
    const nextCars = (x.cars ?? []) as Car[];
    setCars(nextCars);
    if (!selectedCar && nextCars[0]) setSelectedCar(nextCars[0].id);
    setAuthRequired(false);
    return nextCars[0]?.id ?? null;
  }

  async function loadSlots(station: Station, businessServiceId: string, date: string, preferred = '') {
    if (!businessServiceId) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot('');
    setBookingResult(null);
    setError('');
    try {
      const r = await fetch(`/api/availability?businessId=${station.id}&businessServiceId=${businessServiceId}&date=${date}`);
      const x = await r.json();
      if (!r.ok) throw new Error(x.error);
      const nextSlots = (x.slots ?? []) as Slot[];
      setSlots(nextSlots);
      if (preferred && nextSlots.some(slot => slot.slot_start === preferred)) setSelectedSlot(preferred);
    } catch {
      setError('Не удалось загрузить свободное время. Попробуйте другую дату.');
    } finally {
      setSlotsLoading(false);
    }
  }

  async function openBooking(station: Station) {
    const businessServiceId = station.station_services[0]?.id ?? '';
    const intent = { businessId: station.id, businessServiceId, date: today, slotStart: '' };
    localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify(intent));
    setSelected(station);
    setSelectedService(businessServiceId);
    setBookingDate(today);
    setSelectedSlot('');
    setBookingResult(null);
    setAuthRequired(false);
    setError('');
    await loadSlots(station, businessServiceId, today);
  }

  function closeBooking() {
    setSelected(null);
    setAuthRequired(false);
    setBookingResult(null);
    setError('');
  }

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stations${service ? `?service=${encodeURIComponent(service)}` : ''}`)
      .then(async r => {
        const x = await r.json();
        if (!r.ok) throw new Error(x.error);
        return x;
      })
      .then(async x => {
        const nextStations = (x.stations ?? []) as Station[];
        setStations(nextStations);
        const raw = localStorage.getItem(BOOKING_INTENT_KEY);
        if (!raw) return;
        try {
          const intent = JSON.parse(raw) as BookingIntent;
          const station = nextStations.find(item => item.id === intent.businessId);
          if (!station || !station.station_services.some(item => item.id === intent.businessServiceId)) return;
          setSelected(station);
          setSelectedService(intent.businessServiceId);
          setBookingDate(intent.date);
          setSelectedSlot(intent.slotStart || '');
          await loadSlots(station, intent.businessServiceId, intent.date, intent.slotStart);
        } catch {
          localStorage.removeItem(BOOKING_INTENT_KEY);
        }
      })
      .catch(() => setError('Не удалось загрузить СТО. Попробуйте ещё раз.'))
      .finally(() => setLoading(false));
  }, [service]);

  const services = useMemo(
    () => Array.from(new Map(stations.flatMap(s => s.station_services).filter(x => x.services).map(x => [x.services!.id, x.services!])).values()),
    [stations],
  );

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return stations;
    return stations.filter(s =>
      s.name.toLowerCase().includes(value) ||
      s.address.toLowerCase().includes(value) ||
      s.station_services.some(x => x.services?.name.toLowerCase().includes(value)),
    );
  }, [stations, query]);

  async function confirmBooking() {
    if (!selected || !selectedService || !selectedSlot) return;
    const carId = selectedCar || await loadCars();
    if (!carId) return;

    setBookingBusy(true);
    setError('');
    const r = await fetch('/api/me/appointments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ business_service_id: selectedService, car_id: carId, starts_at: selectedSlot }),
    });
    const x = await r.json() as BookingResult & { error?: string };
    setBookingBusy(false);

    if (r.status === 401) {
      localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId: selected.id, businessServiceId: selectedService, date: bookingDate, slotStart: selectedSlot }));
      setAuthRequired(true);
      return;
    }
    if (!r.ok) {
      setError(x.error || 'Не удалось создать запись.');
      return;
    }
    localStorage.removeItem(BOOKING_INTENT_KEY);
    setBookingResult(x);
  }

  return (
    <main className="page">
      <header className="hero">
        <div className="hero-inner">
          <button className="city-selector" type="button">⌖ <span>Новосибирск</span> <ChevronDown size={15} /></button>
          <h1>Найдите СТО и запишитесь без звонков</h1>
          <p>Сравните цену, рейтинг и свободное время. Запись занимает меньше минуты.</p>
        </div>
      </header>

      <div className="content">
        <div className="search-row">
          <div className="search-field">
            <Search size={20} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="СТО, услуга или район" aria-label="Поиск СТО" />
          </div>
          <button className={`filter-button ${filterOpen ? 'active' : ''}`} onClick={() => setFilterOpen(v => !v)} aria-label="Фильтры"><Filter size={18} /></button>
        </div>

        {filterOpen && (
          <div className="filters-drawer">
            <div><span className="filter-label">Услуга</span><select value={service} onChange={e => setService(e.target.value)}><option value="">Все услуги</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <button className="primary compact" onClick={() => setFilterOpen(false)}>Готово</button>
          </div>
        )}

        <div className="view-switch" role="tablist" aria-label="Переключение списка и карты">
          <button className={!showMap ? 'active' : ''} onClick={() => setShowMap(false)}>Список</button>
          <button className={showMap ? 'active' : ''} onClick={() => setShowMap(true)}>Карта</button>
        </div>

        <div className="section-heading">
          <div><h2>СТО рядом</h2><div className="muted">{loading ? 'Загружаем предложения…' : `${filtered.length} сервисов доступно`}</div></div>
          <button className="sort-button" type="button">Сначала ближайшие <ChevronDown size={15} /></button>
        </div>

        {error && !selected && <div className="card error">{error}</div>}

        <div className="results-layout">
          <section className={`results ${showMap ? 'mobile-hidden' : ''}`}>
            {loading && <div className="card">Загружаем сервисы…</div>}
            {!loading && !filtered.length && !error && <div className="card empty"><strong>Ничего не нашли</strong><div className="muted">Попробуйте другую услугу или название СТО.</div></div>}
            {filtered.map(s => (
              <article className="station-card" key={s.id}>
                <div className="station-topline">
                  <span className="open-badge"><span className="open-dot" />Открыто</span>
                  <button
                    className={`favorite-button ${favorites.has(s.id) ? 'liked' : ''}`}
                    onClick={() => void toggleFavorite(s.id)}
                    disabled={favoriteBusy.has(s.id)}
                    aria-label={favorites.has(s.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                    aria-pressed={favorites.has(s.id)}
                  ><Heart size={18} fill={favorites.has(s.id) ? 'currentColor' : 'none'} /></button>
                </div>
                <div className="station-main">
                  <div className="station-thumb" aria-hidden="true"><CarFront size={34} /></div>
                  <div className="station-copy">
                    <h3>{s.name}</h3>
                    <div className="station-address">{s.address}</div>
                    <div className="station-meta"><span><Star size={14} fill="currentColor" /> {s.rating || 0}</span><span>Новосибирск</span></div>
                    <div className="station-tags">{s.station_services.slice(0, 3).map(x => <span key={x.id}>{x.services?.name ?? 'Услуга'}</span>)}</div>
                  </div>
                </div>
                <div className="station-bottom"><strong>от {Math.min(...s.station_services.map(x => x.price)).toLocaleString('ru-RU')} ₽</strong><button className="primary station-book" onClick={() => void openBooking(s)}>Записаться</button></div>
              </article>
            ))}
          </section>

          <section className={`map-panel ${showMap ? 'mobile-visible' : ''}`} aria-label="Карта СТО">
            <CityMap stations={filtered.map(s => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }))} />
          </section>
        </div>

        <section className="feature-grid desktop-features">
          <div className="feature"><strong>Цена до записи</strong><span className="muted">Сравнивайте предложения разных СТО.</span></div>
          <div className="feature"><strong>Реальные слоты</strong><span className="muted">Учитываем рабочие часы и занятые посты.</span></div>
          <div className="feature"><strong>Живая очередь</strong><span className="muted">Следите за позицией автомобиля.</span></div>
        </section>
      </div>

      {selected && (
        <div className="booking-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeBooking(); }}>
          <section className="booking-sheet" role="dialog" aria-modal="true" aria-label="Бронирование СТО" onMouseDown={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div><span className="booking-label">Запись в СТО</span><h2>{selected.name}</h2><div className="muted">{selected.address} · ★ {selected.rating || 0}</div></div>
              <button className="sheet-close" onClick={closeBooking} aria-label="Закрыть"><X size={21} /></button>
            </div>

            {authRequired && <div className="auth-card"><strong>Войдите, чтобы завершить запись</strong><span>СТО, услуга, дата и выбранный слот уже сохранены.</span><a href="/auth?returnTo=/marketplace" className="primary">Войти и продолжить</a></div>}

            <div className="booking-block">
              <div className="booking-title">Выберите услугу</div>
              <div className="service-options">
                {selected.station_services.map(x => <button key={x.id} className={`service-option ${selectedService === x.id ? 'selected' : ''}`} onClick={() => { setSelectedService(x.id); setSelectedSlot(''); setBookingResult(null); localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId:selected.id,businessServiceId:x.id,date:bookingDate,slotStart:'' })); void loadSlots(selected, x.id, bookingDate); }}><span><strong>{x.services?.name ?? 'Услуга'}</strong><small>{x.duration_minutes} мин · от {x.price.toLocaleString('ru-RU')} ₽</small></span><span className="radio-dot" /></button>)}
              </div>
            </div>

            <div className="booking-block">
              <div className="booking-title">Выберите дату</div>
              <div className="date-options">
                {nextDates().map(d => <button key={d.value} className={`date-option ${bookingDate === d.value ? 'selected' : ''}`} onClick={() => { setBookingDate(d.value); setSelectedSlot(''); localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId:selected.id,businessServiceId:selectedService,date:d.value,slotStart:'' })); void loadSlots(selected, selectedService, d.value); }}><strong>{d.title}</strong><span>{d.sub}</span></button>)}
                <label className="date-picker-button"><input type="date" min={today} value={bookingDate} onChange={e => { const value=e.target.value; setBookingDate(value); setSelectedSlot(''); void loadSlots(selected, selectedService, value); }} aria-label="Дата" /><span>⌁</span></label>
              </div>
            </div>

            <div className="booking-block">
              <div className="booking-title-row"><div className="booking-title">Свободное время</div><span className="muted">Актуально сейчас</span></div>
              {slotsLoading ? <div className="slot-loading">Проверяем свободные посты…</div> : slots.length ? <div className="slot-grid">{slots.map(slot => <button key={slot.slot_start} className={`slot-option ${selectedSlot === slot.slot_start ? 'selected' : ''}`} onClick={() => { setSelectedSlot(slot.slot_start); localStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({ businessId:selected.id,businessServiceId:selectedService,date:bookingDate,slotStart:slot.slot_start })); }}><strong>{formatTime(slot.slot_start)}</strong><span>{slot.available_workstations} пост.</span></button>)}</div> : <div className="slots-empty">Свободных слотов на эту дату нет. Выберите другой день.</div>}
            </div>

            {cars.length > 0 && !authRequired && <div className="booking-block"><div className="booking-title">Автомобиль</div><select className="car-select" value={selectedCar} onChange={e => setSelectedCar(e.target.value)}>{cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model}{c.plate_number ? ` · ${c.plate_number}` : ''}</option>)}</select></div>}

            {error && selected && !slotsLoading && <div className="inline-error">{error}</div>}

            {bookingResult ? <div className="booking-success"><div className="success-icon"><Check size={19} /></div><strong>Запись подтверждена</strong><span>{bookingResult.appointment?.starts_at ? `${formatDate(bookingDate)} · ${formatTime(bookingResult.appointment.starts_at)}` : 'Запись создана'}</span><a href="/account" className="primary">Открыть мои записи</a></div> : <div className="booking-summary"><div><strong>{selectedSlot ? `${formatDate(bookingDate)} · ${formatTime(selectedSlot)}` : 'Выберите время'}</strong><span>{selectedService ? (selected.station_services.find(x => x.id === selectedService)?.services?.name ?? 'Услуга') : 'Услуга'}</span></div><button className="primary booking-confirm" disabled={!selectedSlot || bookingBusy} onClick={() => void confirmBooking()}>{bookingBusy ? 'Создаём…' : selectedSlot ? `Записаться за ${(selected.station_services.find(x => x.id === selectedService)?.price ?? 0).toLocaleString('ru-RU')} ₽` : 'Выбрать время'}</button></div>}
          </section>
        </div>
      )}
    </main>
  );
}

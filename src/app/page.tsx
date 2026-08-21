'use client';

import { useEffect, useMemo, useState } from 'react';

type Service = { id: string; name: string; price: number; duration_minutes: number };
type Station = { id: string; name: string; address: string; rating: number; lat: number; lng: number; station_services: Array<{ id: string; service_id: string; price: number; duration_minutes: number; services: { id: string; name: string } | null }> };

declare global { interface Window { Telegram?: { WebApp?: { initData?: string; ready?: () => void; expand?: () => void } } } }

export default function Home() {
  const [stations, setStations] = useState<Station[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Station | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
    fetch('/api/stations').then(r => r.json()).then(x => setStations(x.stations ?? [])).catch(() => setError('Не удалось загрузить СТО')).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => stations.filter(s => !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.station_services.some(x => x.services?.name.toLowerCase().includes(query.toLowerCase()))), [stations, query]);

  return <main className="page">
    <header className="hero"><div className="brand">НА ПОСТ</div><div className="sub">Автосервисы Новосибирска — цена, рейтинг и свободные слоты</div></header>
    <div className="content">
      <div className="search"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Что нужно сделать? Например: замена масла"/><button onClick={() => undefined}>Найти</button></div>
      <section className="map"><div className="map-title">2ГИС · Новосибирск</div><div className="map-placeholder">Карта подключается через MapGL после добавления TWOGIS_MAPGL_KEY</div></section>
      {error && <div className="card error">{error}</div>}
      {loading ? <div className="card">Загружаем СТО…</div> : <section>{filtered.map(s => <article className="card" key={s.id} onClick={() => setSelected(s)}>
        <div className="status"><span className="green">Свободные посты</span></div><h2>{s.name}</h2><div className="muted">{s.address}</div><p>★ {s.rating ?? 0}</p>
        {s.station_services.slice(0,3).map(x => <div className="slot" key={x.id}><span>{x.services?.name ?? 'Услуга'} · {x.duration_minutes} мин · от {x.price} ₽</span><strong>Выбрать</strong></div>)}
      </article>)}</section>}
      {selected && <section className="card booking"><h2>{selected.name}</h2><p className="muted">Выберите услугу и время. Сервер сам назначит свободный пост.</p><button onClick={() => setSelected(null)}>Закрыть</button></section>}
    </div>
  </main>;
}

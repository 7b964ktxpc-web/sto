'use client';

import { useEffect, useMemo, useState } from 'react';

type Appointment = {
  id: string;
  starts_at: string;
  status: string;
  business?: { name: string; slug: string };
  service?: { service?: { name: string } };
  car?: { brand: string; model: string; plate_number: string | null };
  workstation?: { name: string } | null;
  employee?: { name: string; position: string | null } | null;
};

const labels: Record<string, string> = {
  PENDING: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждена',
  ARRIVED: 'Клиент прибыл',
  IN_SERVICE: 'В работе',
  READY: 'Готов',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
  NO_SHOW: 'Неявка',
};

const historyStatuses = new Set(['COMPLETED', 'CANCELLED', 'NO_SHOW', 'READY']);
const TZ = 'Asia/Novosibirsk';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function AccountHistoryPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [status, setStatus] = useState('ALL');
  const [period, setPeriod] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/me/appointments')
      .then(async r => {
        const x = await r.json();
        if (!r.ok) throw new Error(x.error || 'LOAD_FAILED');
        setAppointments((x.appointments ?? []) as Appointment[]);
      })
      .catch(() => setError('Не удалось загрузить историю визитов.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter(a => historyStatuses.has(a.status) || new Date(a.starts_at).getTime() < now)
      .filter(a => status === 'ALL' || a.status === status)
      .filter(a => {
        if (period === 'ALL') return true;
        const age = now - new Date(a.starts_at).getTime();
        return period === '30' ? age <= 30 * 86400000 : age <= 90 * 86400000;
      })
      .sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at));
  }, [appointments, period, status]);

  return (
    <main className="page account-page">
      <header className="hero">
        <div className="hero-inner">
          <span className="eyebrow">STO NSK · Личный кабинет</span>
          <h1>История визитов</h1>
          <p>Все прошлые обращения, выполненные работы и статусы записей.</p>
        </div>
      </header>

      <div className="content">
        <div className="toolbar" style={{ marginBottom: 14 }}>
          <a className="pill" href="/account">← Кабинет</a>
          <a className="primary" href="/marketplace">Новая запись</a>
        </div>

        <section className="card">
          <div className="toolbar">
            <div>
              <h2>Фильтр истории</h2>
              <div className="muted">Показываем завершённые и прошедшие визиты.</div>
            </div>
            <span className="pill">{filtered.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginTop: 12 }}>
            <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Статус визита">
              <option value="ALL">Все статусы</option>
              <option value="COMPLETED">Завершена</option>
              <option value="READY">Готов</option>
              <option value="CANCELLED">Отменена</option>
              <option value="NO_SHOW">Неявка</option>
            </select>
            <select value={period} onChange={e => setPeriod(e.target.value)} aria-label="Период">
              <option value="ALL">За всё время</option>
              <option value="30">Последние 30 дней</option>
              <option value="90">Последние 90 дней</option>
            </select>
          </div>
        </section>

        {error && <div className="card error" style={{ marginTop: 12 }}>{error}</div>}
        {loading && <div className="card" style={{ marginTop: 12 }}>Загружаем историю…</div>}
        {!loading && !filtered.length && !error && <div className="card empty" style={{ marginTop: 12 }}>История пока пуста.</div>}

        {!loading && filtered.map(a => (
          <article className="card" key={a.id} style={{ marginTop: 12 }}>
            <div className="toolbar">
              <div>
                <span className="eyebrow">{formatDate(a.starts_at)}</span>
                <h2 style={{ margin: '4px 0' }}>{a.business?.name || 'СТО'}</h2>
                <div className="muted">{a.service?.service?.name || 'Услуга'} · {a.car?.brand} {a.car?.model}{a.car?.plate_number ? ` · ${a.car.plate_number}` : ''}</div>
              </div>
              <span className="pill">{labels[a.status] || a.status}</span>
            </div>
            <div className="feature-grid" style={{ marginTop: 12 }}>
              <div className="feature"><strong>Пост</strong><span className="muted">{a.workstation?.name || 'Не указан'}</span></div>
              <div className="feature"><strong>Сотрудник</strong><span className="muted">{a.employee?.name || 'Не указан'}</span></div>
              <div className="feature"><strong>Статус</strong><span className="muted">{labels[a.status] || a.status}</span></div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {a.business?.slug && <a className="pill" href={`/novosibirsk/sto/${a.business.slug}`}>Открыть СТО</a>}
              <a className="primary" href="/marketplace">Записаться снова</a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

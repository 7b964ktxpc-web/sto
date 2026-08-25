'use client';

import { useEffect, useState } from 'react';

type NotificationItem = { id: string; type: string; title: string; body: string; read_at: string | null; created_at: string };

const typeLabels: Record<string, string> = {
  APPOINTMENT_CONFIRMED: 'Запись подтверждена',
  APPOINTMENT_CHANGED: 'Запись изменена',
  APPOINTMENT_CANCELLED: 'Запись отменена',
  QUEUE_UPDATE: 'Изменение очереди',
  REMINDER: 'Напоминание',
};

const formatDateTime = (value: string) => new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Asia/Novosibirsk',
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (!response.ok) setError('Войдите в кабинет, чтобы увидеть уведомления.');
      else setError('');
      setItems(data.notifications ?? []);
    } catch {
      setError('Не удалось загрузить уведомления. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const markRead = async (id: string) => {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (response.ok) await load();
  };

  if (loading) return <main className="content"><div className="card">Загружаем уведомления…</div></main>;

  return <main className="content">
    <div className="toolbar">
      <div>
        <span className="pill">STO NSK · Клиент</span>
        <h1 style={{ margin: '8px 0 0' }}>Уведомления</h1>
        <div className="muted">Подтверждения, изменения записи и события очереди.</div>
      </div>
      <a className="pill" href="/account" style={{ textDecoration: 'none' }}>В кабинет</a>
    </div>
    {error && <div className="card error">{error}</div>}
    {!error && items.length === 0 && <div className="card empty"><strong>Уведомлений пока нет</strong><div className="muted">Здесь появятся важные события по вашим записям.</div></div>}
    <section className="results">
      {items.map(item => <article className="card" key={item.id} style={{ borderColor: item.read_at ? '#e5e7eb' : '#cbd5e1' }}>
        <div className="toolbar" style={{ margin: 0 }}>
          <div>
            <div className="pill">{typeLabels[item.type] || item.type}</div>
            <h2>{item.title}</h2>
            <p className="muted" style={{ margin: 0 }}>{item.body}</p>
            <small className="muted">{formatDateTime(item.created_at)}</small>
          </div>
          {!item.read_at && <button className="primary" onClick={() => markRead(item.id)}>Прочитано</button>}
        </div>
      </article>)}
    </section>
  </main>;
}

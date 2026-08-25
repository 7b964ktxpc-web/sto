'use client';

import { useEffect, useMemo, useState } from 'react';

type NotificationItem = { id: string; type: string; title: string; body: string; read_at: string | null; created_at: string };

const typeLabels: Record<string, string> = {
  APPOINTMENT_CREATED: 'Новая запись',
  APPOINTMENT_CONFIRMED: 'Запись подтверждена',
  APPOINTMENT_RESCHEDULED: 'Запись перенесена',
  APPOINTMENT_CANCELLED: 'Запись отменена',
  QUEUE_UPDATED: 'Очередь обновлена',
  APPOINTMENT_STATUS: 'Статус записи',
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Novosibirsk',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (!response.ok) {
        setItems([]);
        setError(response.status === 401 ? 'Войдите в кабинет, чтобы увидеть уведомления.' : (data.error || 'Не удалось загрузить уведомления.'));
        return;
      }
      setItems(data.notifications ?? []);
    } catch {
      setError('Не удалось загрузить уведомления. Проверьте соединение и попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const unreadCount = useMemo(() => items.filter(item => !item.read_at).length, [items]);

  const markRead = async (id: string) => {
    setBusyId(id);
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('READ_FAILED');
      setItems(current => current.map(item => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch {
      setError('Не удалось отметить уведомление прочитанным.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <main className="content"><div className="card">Загружаем уведомления…</div></main>;

  return <main className="content">
    <div className="toolbar">
      <div>
        <span className="pill">STO NSK · Клиент</span>
        <h1 style={{ margin: '8px 0 0' }}>Уведомления</h1>
        <div className="muted">Подтверждения, изменения записи и события очереди.</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {unreadCount > 0 && <span className="pill">Непрочитанных: {unreadCount}</span>}
        <button className="pill" onClick={() => void load()}>Обновить</button>
        <a className="pill" href="/account" style={{ textDecoration: 'none' }}>В кабинет</a>
      </div>
    </div>

    {error && <div className="card error" style={{ marginBottom: 12 }}>{error}</div>}
    {!error && items.length === 0 && <div className="card empty"><strong>Уведомлений пока нет</strong><div className="muted">Здесь появятся важные события по вашим записям.</div></div>}

    <section className="results">
      {items.map(item => (
        <article className="card" key={item.id} style={{ borderColor: item.read_at ? '#e5e7eb' : '#93c5fd', boxShadow: item.read_at ? undefined : '0 10px 28px rgba(37,99,235,.08)' }}>
          <div className="toolbar" style={{ margin: 0 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="pill">{typeLabels[item.type] || item.type}</div>
              <h2>{item.title}</h2>
              <p className="muted" style={{ margin: 0 }}>{item.body}</p>
              <small className="muted">{formatDateTime(item.created_at)}</small>
            </div>
            {!item.read_at && <button className="primary" disabled={busyId === item.id} onClick={() => void markRead(item.id)}>{busyId === item.id ? 'Сохраняем…' : 'Прочитано'}</button>}
          </div>
        </article>
      ))}
    </section>
  </main>;
}

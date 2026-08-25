'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Appointment = {
  id: string;
  business_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  business?: { name: string; slug: string };
  user?: { display_name: string | null; phone: string | null; email: string | null };
  car?: {
    plate_number: string | null;
    year: number | null;
    comments: string | null;
    brand?: { name: string } | null;
    model?: { name: string } | null;
  };
  service?: { price: number; duration_minutes: number; service?: { name: string } };
};

const labels: Record<string, string> = {
  PENDING: 'Ожидает', CONFIRMED: 'Подтверждена', ARRIVED: 'Прибыл', IN_SERVICE: 'В работе',
  READY: 'Готов', COMPLETED: 'Завершена', CANCELLED: 'Отменена', NO_SHOW: 'Неявка',
};
const statuses = Object.keys(labels);
const TZ = 'Asia/Novosibirsk';
const fmt = (value: string) => new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const inputDateTime = (value: string) => new Date(value).toISOString().slice(0, 16);

export default function AdminAppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [status, setStatus] = useState(''); const [starts, setStarts] = useState(''); const [ends, setEnds] = useState('');
  const [note, setNote] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); const [notifyTitle, setNotifyTitle] = useState('Сообщение от STO NSK'); const [notifyMessage, setNotifyMessage] = useState('');

  async function load() {
    const response = await fetch(`/api/admin/appointments/detail?id=${encodeURIComponent(id)}`);
    const data = await response.json();
    if (response.status === 403) { router.replace('/admin/login'); return; }
    if (!response.ok) throw new Error(data.error || 'LOAD_FAILED');
    const next = data.appointment as Appointment;
    setAppointment(next); setStatus(next.status);
    setStarts(inputDateTime(next.starts_at)); setEnds(inputDateTime(next.ends_at));
    setNote(next.notes || '');
  }

  useEffect(() => { void load().catch(() => setError('Не удалось загрузить запись.')); }, [id]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage(''); setError('');
    const start = new Date(starts); const end = new Date(ends);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) { setError('Укажите корректные дату и время визита.'); return; }
    if (end <= start) { setError('Время окончания должно быть позже времени начала.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/admin/appointments/update', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status, starts_at: start.toISOString(), ends_at: end.toISOString(), notes: note }) });
      const data = await response.json();
      if (response.status === 403) { router.replace('/admin/login'); return; }
      if (!response.ok) throw new Error(data.error || 'SAVE_FAILED');
      const next = data.appointment as Appointment;
      setAppointment(next);
      setStatus(next.status);
      setStarts(inputDateTime(next.starts_at));
      setEnds(inputDateTime(next.ends_at));
      setNote(next.notes || '');
      setMessage(data.notified ? 'Сохранено. Клиент уведомлён в приложении и Telegram.' : 'Сохранено.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить'); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setStatus('CANCELLED'); setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/admin/appointments/update', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status: 'CANCELLED' }) });
      const data = await response.json();
      if (response.status === 403) { router.replace('/admin/login'); return; }
      if (!response.ok) throw new Error(data.error || 'CANCEL_FAILED');
      const next = data.appointment as Appointment;
      setAppointment(next);
      setStatus(next.status);
      setStarts(inputDateTime(next.starts_at));
      setEnds(inputDateTime(next.ends_at));
      setNote(next.notes || '');
      setMessage('Запись отменена. Клиент уведомлён.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось отменить запись'); }
    finally { setBusy(false); }
  }

  async function sendNotification(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/admin/appointments/notify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, title: notifyTitle, message: notifyMessage }) });
      const data = await response.json();
      if (response.status === 403) { router.replace('/admin/login'); return; }
      if (!response.ok) throw new Error(data.error || 'NOTIFY_FAILED');
      setMessage('Сообщение отправлено в приложение и Telegram.'); setNotifyMessage('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось отправить уведомление'); }
    finally { setBusy(false); }
  }

  if (error && !appointment) return <main className="content"><div className="card error">{error}</div><a className="primary" href="/admin">В админку</a></main>;
  if (!appointment) return <main className="content"><div className="card">Загружаем запись…</div></main>;

  const customer = appointment.user?.display_name || 'Клиент';
  const car = [appointment.car?.brand?.name, appointment.car?.model?.name].filter(Boolean).join(' ') || 'Автомобиль не указан';

  return (
    <main className="page">
      <header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Запись</span><h1>{customer}</h1><p>{appointment.business?.name || 'СТО'} · {appointment.service?.service?.name || 'Услуга'}</p></div></header>
      <div className="content">
        <div className="toolbar"><a className="pill" href={`/admin/businesses/${appointment.business_id}/calendar`}>← Календарь</a><a className="pill" href="/admin">Админка</a></div>
        <div className="feature-grid"><div className="feature"><strong>Статус</strong><span className="big-value">{labels[appointment.status] || appointment.status}</span></div><div className="feature"><strong>Визит</strong><span className="muted">{fmt(appointment.starts_at)}</span></div><div className="feature"><strong>Автомобиль</strong><span className="muted">{car}</span></div><div className="feature"><strong>Стоимость</strong><span className="big-value">{appointment.service?.price ?? 0} ₽</span></div></div>
        <div className="feature-grid" style={{ marginTop: 16 }}><section className="card"><h2>Клиент</h2><div className="service-row"><strong>Имя</strong><span>{customer}</span></div><div className="service-row"><strong>Телефон</strong><span>{appointment.user?.phone || '—'}</span></div><div className="service-row"><strong>Email</strong><span>{appointment.user?.email || '—'}</span></div></section><section className="card"><h2>Автомобиль</h2><div className="service-row"><strong>Машина</strong><span>{car}</span></div><div className="service-row"><strong>Номер</strong><span>{appointment.car?.plate_number || '—'}</span></div></section></div>
        <section className="card" style={{ marginTop: 16 }}><h2>Изменить запись</h2><form onSubmit={save} className="form-stack"><label>Статус<select value={status} onChange={event => setStatus(event.target.value)}>{statuses.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label><div className="two-columns"><label>Начало<input type="datetime-local" value={starts} onChange={event => setStarts(event.target.value)} /></label><label>Конец<input type="datetime-local" value={ends} onChange={event => setEnds(event.target.value)} /></label></div><label>Комментарий<textarea rows={4} value={note} onChange={event => setNote(event.target.value)} placeholder="Комментарий администратора" /></label>{message && <div className="card">{message}</div>}{error && <div className="card error">{error}</div>}<div className="actions"><button className="primary" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить изменения'}</button><button type="button" onClick={() => void cancel()} disabled={busy || status === 'CANCELLED'}>Отменить запись</button></div></form></section>
        <section className="card" style={{ marginTop: 16 }}><h2>Сообщение клиенту</h2><p className="muted">Сообщение появится в кабинете клиента и будет поставлено в Telegram-очередь отправки.</p><form onSubmit={sendNotification} className="form-stack"><label>Заголовок<input value={notifyTitle} onChange={event => setNotifyTitle(event.target.value)} /></label><label>Сообщение<textarea rows={5} maxLength={1000} required value={notifyMessage} onChange={event => setNotifyMessage(event.target.value)} placeholder="Например: пост освободился раньше, можете приехать на 30 минут раньше." /></label><button className="primary" type="submit" disabled={busy || !notifyMessage.trim()}>Отправить клиенту</button></form></section>
      </div>
      <style jsx>{` .big-value{font-size:22px;font-weight:800}.form-stack{display:grid;gap:12px;margin-top:12px}.form-stack label{display:grid;gap:6px;font-weight:600}.form-stack input,.form-stack select,.form-stack textarea{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid rgba(0,0,0,.12);border-radius:10px;background:#fff;font:inherit}.two-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px}.actions{display:flex;gap:8px;flex-wrap:wrap}.actions button{padding:11px 14px;border-radius:10px;border:1px solid rgba(0,0,0,.12);background:#fff;font:inherit;font-weight:700;cursor:pointer}@media(max-width:700px){.two-columns{grid-template-columns:1fr}} `}</style>
    </main>
  );
}

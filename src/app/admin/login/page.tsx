'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error === 'INVALID_CREDENTIALS' ? 'Неверный логин или пароль.' : 'Не удалось войти в админку.');
        return;
      }
      router.replace('/admin');
      router.refresh();
    } catch {
      setError('Не удалось подключиться к серверу.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section className="card" style={{ width: '100%', maxWidth: 430 }}>
        <span className="eyebrow">STO NSK · Admin</span>
        <h1 style={{ marginTop: 8 }}>Вход в админку</h1>
        <p className="muted">Временный доступ администратора. После запуска поменяй пароль через переменные окружения.</p>

        <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 18 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="muted">Логин</span>
            <input value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="muted">Пароль</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          {error && <div className="card error">{error}</div>}
          <button className="primary" disabled={busy} type="submit">{busy ? 'Входим…' : 'Войти'}</button>
        </form>

        <div className="muted" style={{ marginTop: 14, fontSize: 12 }}>
          По умолчанию: <strong>admin / admin</strong>
        </div>
      </section>
    </main>
  );
}

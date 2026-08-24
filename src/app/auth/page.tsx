'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock, MessageCircle, UserRound } from 'lucide-react';

function AuthForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/account';
  const requestedMode = searchParams.get('mode');
  const isBookingReturn = returnTo.includes('marketplace');
  const [mode, setMode] = useState<'login' | 'signup'>(requestedMode === 'signup' ? 'signup' : 'login');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const signup = mode === 'signup';
    const payload = signup
      ? { email: identifier.includes('@') ? identifier : undefined, phone: identifier.includes('@') ? undefined : identifier, display_name: name, password }
      : { identifier, password };

    try {
      const res = await fetch(signup ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === 'USER_ALREADY_EXISTS'
            ? 'Пользователь уже зарегистрирован.'
            : data.error === 'SUPABASE_NOT_CONFIGURED'
              ? 'Авторизация временно недоступна.'
              : data.error === 'INVALID_SIGNUP_DATA'
                ? 'Укажите email или телефон и пароль не короче 8 символов.'
                : 'Не удалось выполнить вход. Проверьте данные.',
        );
        setBusy(false);
        return;
      }
      window.location.href = returnTo;
    } catch {
      setError('Сервис авторизации временно недоступен.');
      setBusy(false);
    }
  }

  return (
    <main className="page auth-page">
      <header className="hero auth-hero">
        <div className="hero-inner">
          <a className="auth-back" href={isBookingReturn ? '/marketplace' : '/'}><ArrowLeft size={18} /> Назад</a>
          <div className="auth-brand"><Lock size={18} /> STO NSK · Новосибирск</div>
          <h1>{isBookingReturn ? 'Продолжите запись' : mode === 'login' ? 'Войдите в STO NSK' : 'Создайте аккаунт'}</h1>
          <p>{isBookingReturn ? 'Ваш выбор СТО и слот сохранены. После входа вы вернётесь прямо к подтверждению.' : 'Автомобили, записи, избранные СТО и уведомления — в одном месте.'}</p>
        </div>
      </header>

      <div className="content auth-content">
        <section className="auth-panel">
          <div className="auth-tabs">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Войти</button>
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Регистрация</button>
          </div>

          {isBookingReturn && (
            <div className="booking-return-note">
              <strong>Запись сохранена</strong>
              <span>После авторизации вернём вас к выбранному времени.</span>
            </div>
          )}

          <form onSubmit={submit} className="auth-form">
            {mode === 'signup' && (
              <label>
                <span>Имя</span>
                <div className="auth-input"><UserRound size={18} /><input placeholder="Как к вам обращаться" value={name} onChange={e => setName(e.target.value)} required /></div>
              </label>
            )}
            <label>
              <span>Email или телефон</span>
              <input placeholder="you@example.com или +7 999…" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
            </label>
            <label>
              <span>Пароль</span>
              <input type="password" minLength={8} placeholder="Минимум 8 символов" value={password} onChange={e => setPassword(e.target.value)} required />
            </label>
            {error && <div className="auth-error">{error}</div>}
            <button className="primary auth-submit" disabled={busy}>{busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</button>
          </form>

          <div className="auth-divider"><span>или</span></div>

          <a className="telegram-auth" href="/tg"><MessageCircle size={20} /><span><strong>Войти через Telegram</strong><small>Без пароля в Mini App</small></span></a>
        </section>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<main className="page"><div className="content" style={{ maxWidth: 620 }}><section className="card">Загрузка…</section></div></main>}>
      <AuthForm />
    </Suspense>
  );
}

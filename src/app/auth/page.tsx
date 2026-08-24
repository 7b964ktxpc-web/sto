'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function AuthPage() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/account';
  const requestedMode = searchParams.get('mode');
  const [mode, setMode] = useState<'login'|'signup'>(requestedMode === 'signup' ? 'signup' : 'login');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    const signup = mode === 'signup';
    const payload = signup
      ? { email: identifier.includes('@') ? identifier : undefined, phone: identifier.includes('@') ? undefined : identifier, display_name: name, password }
      : { identifier, password };
    try {
      const res = await fetch(signup ? '/api/auth/signup' : '/api/auth/login', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'USER_ALREADY_EXISTS' ? 'Пользователь уже зарегистрирован.' : data.error === 'SUPABASE_NOT_CONFIGURED' ? 'Авторизация временно недоступна. Проверьте настройки Supabase.' : data.error === 'INVALID_SIGNUP_DATA' ? 'Укажите email или телефон и пароль не короче 8 символов.' : 'Не удалось выполнить вход. Проверьте данные.');
        setBusy(false);
        return;
      }
      window.location.href = returnTo;
    } catch {
      setError('Сервис авторизации временно недоступен.');
      setBusy(false);
    }
  }

  return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Авторизация</span><h1>{mode === 'login' ? 'Войдите в STO NSK' : 'Создайте аккаунт'}</h1><p>Сохраняйте автомобили, записи, избранные СТО и уведомления в одном аккаунте.</p></div></header><div className="content" style={{maxWidth:620}}><section className="card"><div style={{display:'flex',gap:8,marginBottom:18}}><button type="button" className={mode==='login'?'primary':'pill'} onClick={()=>setMode('login')}>Войти</button><button type="button" className={mode==='signup'?'primary':'pill'} onClick={()=>setMode('signup')}>Регистрация</button></div><form onSubmit={submit} style={{display:'grid',gap:12}}>{mode==='signup'&&<input placeholder="Имя" value={name} onChange={e=>setName(e.target.value)} required /> }<input placeholder="Email или телефон" value={identifier} onChange={e=>setIdentifier(e.target.value)} required /><input type="password" minLength={8} placeholder="Пароль (минимум 8 символов)" value={password} onChange={e=>setPassword(e.target.value)} required />{error&&<div className="error">{error}</div>}<button className="primary" disabled={busy}>{busy?'Подождите…':mode==='login'?'Войти':'Создать аккаунт'}</button></form><div className="section"><div className="feature"><strong>Telegram</strong><span className="muted">Можно использовать Telegram Mini App для входа без пароля.</span><a href="/tg" className="primary" style={{display:'inline-block',textDecoration:'none',marginTop:8}}>Открыть Telegram Mini App</a></div></div></section></div></main>;
}

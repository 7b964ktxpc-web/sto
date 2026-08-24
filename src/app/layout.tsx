import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = { title: 'НА ПОСТ', description: 'Поиск и бронирование автосервисов в Новосибирске' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}<nav className="mobile-nav" aria-label="Основная навигация"><Link href="/marketplace"><span>⌕</span><small>СТО</small></Link><Link href="/account"><span>◉</span><small>Кабинет</small></Link><Link href="/notifications"><span>◌</span><small>Уведомления</small></Link><Link href="/auth"><span>↪</span><small>Войти</small></Link></nav><Script src="https://telegram.org/js/telegram-web-app.js?57" strategy="beforeInteractive" /></body></html>;
}

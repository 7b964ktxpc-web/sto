import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { Bell, Heart, Home, Plus, UserRound } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: 'НА ПОСТ',
  description: 'Поиск и бронирование автосервисов в Новосибирске',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        {children}
        <nav className="mobile-nav" aria-label="Основная навигация">
          <Link href="/marketplace" className="active"><Home size={20} /><small>Главная</small></Link>
          <Link href="/account"><Heart size={20} /><small>Избранное</small></Link>
          <Link href="/marketplace" className="nav-center" aria-label="Записаться"><Plus size={24} /><small>Записаться</small></Link>
          <Link href="/notifications"><Bell size={20} /><small>Уведомления</small></Link>
          <Link href="/account"><UserRound size={20} /><small>Профиль</small></Link>
        </nav>
        <Script src="https://telegram.org/js/telegram-web-app.js?57" strategy="beforeInteractive" />
      </body>
    </html>
  );
}

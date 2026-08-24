import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { Bell, CalendarPlus, Heart, Home, UserRound } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = { title: 'НА ПОСТ', description: 'Поиск и бронирование автосервисов в Новосибирске' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}<nav className="mobile-nav" aria-label="Основная навигация"><Link href="/marketplace"><Home size={21}/><small>Главная</small></Link><Link href="/account"><Heart size={21}/><small>Избранное</small></Link><Link className="mobile-nav-main" href="/marketplace"><span><CalendarPlus size={24}/></span><small>Записаться</small></Link><Link href="/notifications"><Bell size={21}/><small>Уведомления</small></Link><Link href="/account"><UserRound size={21}/><small>Профиль</small></Link></nav><Script src="https://telegram.org/js/telegram-web-app.js?57" strategy="beforeInteractive" /></body></html>;
}

'use client';

import Link from 'next/link';
import { Bell, Heart, Home, Plus, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function MobileNav() {
  const pathname = usePathname();
  if (pathname === '/auth' || pathname.startsWith('/auth/')) return null;

  return (
    <nav className="mobile-nav" aria-label="Основная навигация">
      <Link href="/marketplace" className={pathname === '/marketplace' ? 'active' : ''}>
        <Home size={20} />
        <small>Главная</small>
      </Link>
      <Link href="/account">
        <Heart size={20} />
        <small>Избранное</small>
      </Link>
      <Link href="/marketplace" className="nav-center" aria-label="Записаться">
        <Plus size={24} />
        <small>Записаться</small>
      </Link>
      <Link href="/notifications">
        <Bell size={20} />
        <small>Уведомления</small>
      </Link>
      <Link href="/account" className={pathname === '/account' ? 'active' : ''}>
        <UserRound size={20} />
        <small>Профиль</small>
      </Link>
    </nav>
  );
}

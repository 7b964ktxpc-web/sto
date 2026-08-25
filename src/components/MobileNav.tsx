'use client';

import Link from 'next/link';
import { Bell, Heart, Home, Plus, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function MobileNav() {
  const pathname = usePathname();

  // Keep the customer bottom navigation isolated from screens that have their own
  // navigation or a focused auth/account layout.
  const isPrivateAppArea =
    pathname === '/auth' ||
    pathname.startsWith('/auth/') ||
    pathname === '/account' ||
    pathname.startsWith('/account/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/business' ||
    pathname.startsWith('/business/') ||
    pathname === '/telegram' ||
    pathname.startsWith('/telegram/') ||
    pathname === '/tg' ||
    pathname.startsWith('/tg/');

  if (isPrivateAppArea) return null;

  return (
    <nav className="mobile-nav" aria-label="Основная навигация">
      <Link href="/marketplace" className={pathname === '/marketplace' ? 'active' : ''}>
        <Home size={20} />
        <small>Главная</small>
      </Link>
      <Link href="/account#favorites" className="nav-account-link">
        <Heart size={20} />
        <small>Избранное</small>
      </Link>
      <Link href="/marketplace" className="nav-center" aria-label="Записаться">
        <Plus size={24} />
        <small>Записаться</small>
      </Link>
      <Link href="/notifications" className={pathname.startsWith('/notifications') ? 'active' : ''}>
        <Bell size={20} />
        <small>Уведомления</small>
      </Link>
      <Link href="/account" className="nav-profile-link">
        <UserRound size={20} />
        <small>Профиль</small>
      </Link>
    </nav>
  );
}

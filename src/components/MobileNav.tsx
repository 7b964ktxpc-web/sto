'use client';

import Link from 'next/link';

export default function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Основная навигация">
      <Link href="/marketplace">
        <span>⌕</span>
        <small>СТО</small>
      </Link>
      <Link href="/account">
        <span>◯</span>
        <small>Кабинет</small>
      </Link>
      <Link href="/notifications">
        <span>◉</span>
        <small>Уведомления</small>
      </Link>
      <Link href="/auth">
        <span>↪</span>
        <small>Войти</small>
      </Link>
    </nav>
  );
}

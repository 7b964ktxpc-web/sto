'use client';

import { ReactNode, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  ['/admin', 'Обзор'],
  ['/admin/businesses', 'СТО'],
  ['/admin/analytics', 'Аналитика'],
  ['/admin/reviews', 'Отзывы'],
  ['/admin/audit', 'Аудит'],
  ['/admin/billing', 'Финансы'],
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (pathname === '/admin/login') return <>{children}</>;

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.replace('/admin/login');
      router.refresh();
      setBusy(false);
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="eyebrow">STO NSK</div>
          <strong>Admin</strong>
        </div>
        <nav className="admin-nav" aria-label="Админ-навигация">
          {links.map(([href, label]) => (
            <a key={href} href={href} className={pathname === href ? 'active' : ''}>{label}</a>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <a href="/marketplace">Открыть marketplace</a>
          <button onClick={() => void logout()} disabled={busy}>{busy ? 'Выходим…' : 'Выйти'}</button>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
      <style jsx>{`
        .admin-shell{min-height:100dvh;display:grid;grid-template-columns:250px minmax(0,1fr);background:var(--background,#f6f7f9)}
        .admin-sidebar{position:sticky;top:0;height:100dvh;padding:22px 16px;border-right:1px solid rgba(0,0,0,.08);background:#fff;display:flex;flex-direction:column;gap:20px}
        .admin-brand{padding:8px 10px;font-size:22px}.admin-brand .eyebrow{display:block;font-size:11px;margin-bottom:2px}
        .admin-nav{display:grid;gap:6px}.admin-nav a,.admin-sidebar-bottom a,.admin-sidebar-bottom button{display:block;width:100%;padding:11px 12px;border-radius:10px;text-decoration:none;color:inherit;background:transparent;border:0;text-align:left;font:inherit;cursor:pointer}
        .admin-nav a:hover,.admin-sidebar-bottom a:hover,.admin-sidebar-bottom button:hover{background:#f3f5f7}.admin-nav a.active{background:#111827;color:#fff}
        .admin-sidebar-bottom{margin-top:auto;display:grid;gap:5px}.admin-main{min-width:0}.admin-shell :global(.page){min-height:100dvh}
        @media(max-width:800px){.admin-shell{display:block}.admin-sidebar{position:sticky;z-index:30;top:0;height:auto;padding:10px;border-right:0;border-bottom:1px solid rgba(0,0,0,.08);gap:8px}.admin-brand{display:none}.admin-nav{display:flex;overflow:auto;gap:6px}.admin-nav a{white-space:nowrap}.admin-sidebar-bottom{display:flex;gap:6px;margin:0}.admin-sidebar-bottom a,.admin-sidebar-bottom button{width:auto;white-space:nowrap;padding:9px 10px}}
      `}</style>
    </div>
  );
}

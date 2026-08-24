'use client';

import { useEffect, useState } from 'react';

export default function ProfileActions({ businessId }: { businessId: string }) {
  const [favorite, setFavorite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState(false);
  useEffect(() => {
    fetch('/api/me/favorites').then(async r => {
      if (r.status === 401) return;
      if (!r.ok) return;
      const x = await r.json();
      setFavorite((x.favorites ?? []).some((f: { business_id: string }) => f.business_id === businessId));
    }).catch(() => undefined);
  }, [businessId]);
  async function toggle() {
    setBusy(true);
    const r = await fetch('/api/me/favorites', {
      method: favorite ? 'DELETE' : 'POST',
      ...(favorite ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ business_id: businessId }) }),
    });
    if (r.status === 401) setAuth(true);
    else if (r.ok) setFavorite(!favorite);
    setBusy(false);
  }
  return <div style={{display:'flex',gap:8,alignItems:'center'}}>
    {auth && <span className="muted">Войдите, чтобы сохранять СТО</span>}
    <button className={favorite ? 'primary' : 'pill'} disabled={busy} onClick={() => void toggle()}>{favorite ? '♥ В избранном' : '♡ В избранное'}</button>
  </div>;
}

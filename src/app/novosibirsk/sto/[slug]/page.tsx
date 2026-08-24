import { notFound } from 'next/navigation';
import { getAdminClient } from '@/server/supabase/admin';
import ProfileActions from './profile-actions';

export default async function BusinessProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getAdminClient();
  const { data: business } = await db.from('businesses').select('id,name,slug,phone,rating,review_count,description').eq('slug', slug).eq('status', 'active').is('deleted_at', null).maybeSingle();
  if (!business) notFound();

  const [{ data: location }, { data: services }, { data: reviews }, { data: workstations }] = await Promise.all([
    db.from('business_locations').select('address,location').eq('business_id', business.id).eq('is_primary', true).maybeSingle(),
    db.from('business_services').select('id,price,min_price,duration_minutes,services(id,name)').eq('business_id', business.id).eq('is_active', true).order('price'),
    db.from('reviews').select('id,rating,body,created_at,users(display_name)').eq('business_id', business.id).eq('is_published', true).order('created_at', { ascending: false }).limit(20),
    db.from('workstations').select('id,name,status').eq('business_id', business.id).eq('is_active', true).order('name'),
  ]);

  return <main className="page">
    <header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Новосибирск</span><h1>{business.name}</h1><p>{business.description || 'Автосервис в Новосибирске с онлайн-записью.'}</p></div></header>
    <div className="content">
      <section className="card">
        <div className="toolbar"><div><div className="rating">★ {business.rating || 0}</div><div className="muted">{business.review_count || 0} отзывов · {location?.address || 'Адрес уточняется'}</div></div><ProfileActions businessId={business.id} /></div>
        <div className="feature-grid" style={{marginTop:14}}><div className="feature"><strong>{(workstations || []).filter((w:any)=>w.status === 'AVAILABLE').length}</strong><span className="muted">свободных постов</span></div><div className="feature"><strong>{(services || []).length}</strong><span className="muted">услуг</span></div><div className="feature"><strong>Онлайн</strong><span className="muted">запись доступна</span></div></div>
      </section>
      <section className="card"><div className="toolbar"><div><h2>Услуги и цены</h2><div className="muted">Цена и длительность зависят от конкретного СТО.</div></div></div>{(services || []).map((s:any)=><div className="service-row" key={s.id}><div><strong>{s.services?.name || 'Услуга'}</strong><div className="muted">{s.duration_minutes} мин</div></div><strong>от {Number(s.min_price ?? s.price).toLocaleString('ru-RU')} ₽</strong></div>)}</section>
      <section className="card"><div className="toolbar"><div><h2>Отзывы</h2><div className="muted">Только отзывы после завершённого обслуживания.</div></div></div>{!(reviews || []).length?<div className="empty muted">Пока нет опубликованных отзывов.</div>:(reviews || []).map((r:any)=><div className="service-row" key={r.id}><div><strong>{r.users?.display_name || 'Клиент'}</strong><div className="muted">{'★'.repeat(r.rating)} · {r.body || 'Без комментария'}</div></div><span className="muted">{new Date(r.created_at).toLocaleDateString('ru-RU')}</span></div>)}</section>
      <section className="card"><div className="toolbar"><div><h2>Запись</h2><div className="muted">Выберите услугу и ближайшее свободное время.</div></div><a className="primary" href={`/marketplace?business=${encodeURIComponent(business.id)}`} style={{textDecoration:'none'}}>Записаться</a></div></section>
    </div>
  </main>;
}

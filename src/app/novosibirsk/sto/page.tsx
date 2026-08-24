import { getAdminClient } from '@/server/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function StationsDirectoryPage() {
  const db = getAdminClient();
  const { data: businesses } = await db.from('businesses').select('id,name,slug,rating,review_count,description').eq('status','active').is('deleted_at',null).order('rating',{ascending:false});
  const { data: locations } = await db.from('business_locations').select('business_id,address').eq('is_primary',true);
  const addressByBusiness = new Map((locations ?? []).map((x:any)=>[x.business_id,x.address]));
  return <main className="page"><header className="hero"><div className="hero-inner"><span className="eyebrow">STO NSK · Новосибирск</span><h1>Каталог автосервисов</h1><p>Сравнивайте рейтинг, отзывы, услуги и записывайтесь онлайн.</p></div></header><div className="content"><div className="layout"><section className="results">{(businesses ?? []).map((b:any)=><article className="card" key={b.id}><div className="rating">★ {b.rating || 0} · {b.review_count || 0} отзывов</div><h2>{b.name}</h2><div className="muted">{addressByBusiness.get(b.id) || 'Новосибирск'}</div><p className="muted">{b.description || 'Онлайн-запись, свободные слоты и управление очередью.'}</p><a className="primary" href={`/novosibirsk/sto/${b.slug}`} style={{display:'inline-block',textDecoration:'none'}}>Открыть СТО</a></article>)}</section></div></div></main>;
}

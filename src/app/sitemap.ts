import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sto-wheat.vercel.app';
  const paths = ['','/marketplace','/novosibirsk','/novosibirsk/sto','/business','/admin','/tg'];
  return paths.map(path => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path.includes('sto') ? 'daily' : 'weekly', priority: path === '' ? 1 : 0.7 }));
}

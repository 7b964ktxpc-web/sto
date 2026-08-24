import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sto-wheat.vercel.app';
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/business', '/api/'] }, sitemap: `${base}/sitemap.xml` };
}

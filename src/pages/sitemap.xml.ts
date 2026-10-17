import type { APIRoute } from 'astro';
import { sql } from '../server/db.ts';
import { getSections } from '../server/sections.ts';

export const GET: APIRoute = async ({ url }) => {
  const base = (process.env.SITE_URL || url.origin).replace(/\/$/, '');
  const sections = await getSections({ publishedOnly: true });
  const pages = await sql<{ slug: string; updatedAt: Date }[]>`SELECT slug, updated_at FROM pages WHERE is_published`;
  const news = await sql<{ slug: string; updatedAt: Date }[]>`SELECT slug, updated_at FROM news WHERE is_published AND published_at <= now()`;

  // Фото раздела — в sitemap для Google Картинок
  const entry = (loc: string, lastmod?: Date, image?: string | null) =>
    `<url><loc>${base}${loc}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}` +
    `${image ? `<image:image><image:loc>${base}/uploads/${image}</image:loc></image:image>` : ''}</url>`;
  const urls = [
    entry('/'),
    ...sections.map((s) => entry(`/${s.slug}`, s.updatedAt, s.image)),
    ...pages.map((p) => entry(`/${p.slug}`, p.updatedAt)),
    entry('/news'),
    ...news.map((n) => entry(`/news/${n.slug}`, n.updatedAt)),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

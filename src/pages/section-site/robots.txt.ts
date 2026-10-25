import type { APIRoute } from 'astro';
import { siteUrl } from '../../server/sections.ts';

export const GET: APIRoute = ({ locals }) => {
  if (!locals.site) return new Response('Not found', { status: 404 });
  // Отфильтрованный каталог (?f=…) — те же товары, что и без фильтров: в поиск не нужен
  const body = ['User-agent: *', 'Disallow: /*?f=', '', `Sitemap: ${siteUrl(locals.site)}/sitemap.xml`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

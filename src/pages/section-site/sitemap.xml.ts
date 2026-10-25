// Карта сайта раздела: главная с каталогом и страницы товаров с фото.
import type { APIRoute } from 'astro';
import { siteUrl } from '../../server/sections.ts';
import { getProducts } from '../../server/products.ts';

export const GET: APIRoute = async ({ locals }) => {
  const site = locals.site;
  if (!site) return new Response('Not found', { status: 404 });
  const base = siteUrl(site);
  const products = await getProducts(site.id);
  const entry = (loc: string, lastmod: Date, images: string[] = []) =>
    `<url><loc>${base}${loc}</loc><lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` +
    images.map((i) => `<image:image><image:loc>${base}/uploads/${i}</image:loc></image:image>`).join('') + '</url>';
  const urls = [entry('/', site.updatedAt, site.image ? [site.image] : []), ...products.map((p) => entry(`/${p.slug}`, p.updatedAt, p.images))];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

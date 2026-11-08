// Карта сайта: главная, разделы, каталоги разделов (группы, категории и товары с фото), страницы (в том числе
// «Укладка и уход» в каталоге: /linoleum/ukladka), новости.
import type { APIRoute } from 'astro';
import { sql } from '../server/db.ts';
import { catalogPath, getSections } from '../server/sections.ts';
import { pagePath } from '../server/section-guides.ts';
import { getCategoryTree, getProducts } from '../server/products.ts';

export const GET: APIRoute = async ({ url }) => {
  const base = (process.env.SITE_URL || url.origin).replace(/\/$/, '');
  const sections = await getSections({ publishedOnly: true });
  const pages = await sql<{ slug: string; updatedAt: Date }[]>`SELECT slug, updated_at FROM pages WHERE is_published`;
  const news = await sql<{ slug: string; updatedAt: Date }[]>`SELECT slug, updated_at FROM news WHERE is_published AND published_at <= now()`;

  // Фото раздела и товаров — в sitemap для Google Картинок
  const entry = (loc: string, lastmod?: Date, images: (string | null | undefined)[] = []) =>
    `<url><loc>${base}${loc}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}` +
    images.filter(Boolean).map((i) => `<image:image><image:loc>${base}/uploads/${i}</image:loc></image:image>`).join('') + '</url>';

  // Каталоги разделов: /linoleum, группы и категории (вид 'groups'), /linoleum/<товар>
  const catalogs: string[] = [];
  for (const s of sections.filter((x) => x.siteHost)) {
    const products = await getProducts(s.id);
    const tree = s.siteLayout === 'groups' ? await getCategoryTree(s.id) : [];
    catalogs.push(
      entry(catalogPath(s), s.updatedAt, [s.image]),
      ...tree.flatMap((g) => [g, ...g.children]).map((c) => entry(catalogPath(s, c.slug), s.updatedAt)),
      ...products.map((p) => entry(catalogPath(s, p.slug), p.updatedAt, p.images)),
    );
  }
  const urls = [
    entry('/'),
    // Разделы со ссылкой на другой сайт (Паркет) сюда не входят: их адреса здесь переадресуют
    ...sections.filter((s) => !s.siteHost && !s.link).map((s) => entry(`/${s.slug}`, s.updatedAt, [s.image])),
    ...catalogs,
    ...pages.map((p) => entry(pagePath(p.slug, sections), p.updatedAt)),
    entry('/news'),
    ...news.map((n) => entry(`/news/${n.slug}`, n.updatedAt)),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

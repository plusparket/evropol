import { sql } from './db.ts';
import { slugify } from './util.ts';

export type Page = {
  id: number; slug: string; title: string; content: string;
  seoTitle: string; seoDescription: string; isPublished: boolean; updatedAt: Date;
};
export type News = {
  id: number;
  /** Адрес записи: /news/<slug> */
  slug: string;
  title: string; excerpt: string; content: string;
  publishedAt: Date; isPublished: boolean; views: number;
  /** Обложка в списке новостей (путь в uploads) */
  image: string;
  /** Ссылка на пост, если запись загружена из Instagram */
  sourceUrl: string;
};
export type MenuName = 'top' | 'footer_company';
export type MenuItem = { id: number; menu: MenuName; label: string; url: string; sortOrder: number; newTab: boolean };

export const MENUS: { key: MenuName; title: string }[] = [
  { key: 'top', title: 'Верхнее меню (строка над логотипом и раздел «Компания» в кнопке «Меню»)' },
  { key: 'footer_company', title: 'Подвал: колонка «Компания»' },
];

/** Адреса, которые заняты системными разделами и не могут быть адресом страницы или категории. */
export const RESERVED_SLUGS = new Set([
  'admin', 'news', 'uploads', 'img', 'fonts', 'css', 'healthz', 'sitemap.xml', 'robots.txt', 'favicon.ico', '_astro',
  'llms.txt', 'llms-full.txt',
]);

export async function getPageBySlug(slug: string): Promise<Page | undefined> {
  const [p] = await sql<Page[]>`SELECT * FROM pages WHERE slug = ${slug} AND is_published`;
  return p;
}

export async function getMenus(): Promise<Record<MenuName, MenuItem[]>> {
  const rows = await sql<MenuItem[]>`SELECT * FROM menu_items ORDER BY sort_order, id`;
  const out: Record<MenuName, MenuItem[]> = { top: [], footer_company: [] };
  for (const r of rows) out[r.menu]?.push(r);
  return out;
}

export async function listNews(limit = 50, offset = 0): Promise<News[]> {
  return sql<News[]>`
    SELECT * FROM news WHERE is_published AND published_at <= now()
    ORDER BY published_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
}

export async function getNews(id: number): Promise<News | undefined> {
  const [n] = await sql<News[]>`SELECT * FROM news WHERE id = ${id} AND is_published AND published_at <= now()`;
  return n;
}

/** Новость по адресу: /news/my-zapustili-svoy-veb-sayt */
export async function getNewsBySlug(slug: string): Promise<News | undefined> {
  const [n] = await sql<News[]>`SELECT * FROM news WHERE slug = ${slug} AND is_published AND published_at <= now()`;
  return n;
}

/**
 * Свободный адрес новости из названия: латиница, до 60 знаков по границе слова, при совпадении — «-2», «-3».
 * Русское название переводится буквами (транслит); английский адрес можно вписать в админке («Новости» → запись).
 */
export async function uniqueNewsSlug(title: string, exceptId = 0): Promise<string> {
  let base = slugify(title.replace(/[^\p{L}\p{N}\s-]/gu, ' '));
  if (base.length > 60) base = base.slice(0, 60).replace(/-[^-]*$/, '');
  base ||= 'post';
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const [taken] = await sql`SELECT 1 FROM news WHERE slug = ${slug} AND id <> ${exceptId}`;
    if (!taken) return slug;
  }
}

/** Записи без адреса (новые посты Instagram, записи из админки) получают его из названия. Вызывается при запуске сайта. */
export async function ensureNewsSlugs(): Promise<number> {
  const rows = await sql<{ id: number; title: string }[]>`SELECT id, title FROM news WHERE slug IS NULL OR slug = '' ORDER BY id`;
  for (const r of rows) await sql`UPDATE news SET slug = ${await uniqueNewsSlug(r.title, r.id)} WHERE id = ${r.id}`;
  return rows.length;
}

// --- Статистика посещений -------------------------------------------------------

export async function trackVisit(isNewVisitor: boolean): Promise<void> {
  await sql`
    INSERT INTO visits_daily (day, visitors, hits) VALUES (current_date, ${isNewVisitor ? 1 : 0}, 1)
    ON CONFLICT (day) DO UPDATE SET
      visitors = visits_daily.visitors + EXCLUDED.visitors,
      hits = visits_daily.hits + 1`;
}

export async function visitStats(): Promise<{ today: number; yesterday: number; week: number; month: number }> {
  const [row] = await sql<{ today: number; yesterday: number; week: number; month: number }[]>`
    SELECT
      coalesce(sum(visitors) FILTER (WHERE day = current_date), 0)::int AS today,
      coalesce(sum(visitors) FILTER (WHERE day = current_date - 1), 0)::int AS yesterday,
      coalesce(sum(visitors) FILTER (WHERE day > current_date - 7), 0)::int AS week,
      coalesce(sum(visitors) FILTER (WHERE day > current_date - 30), 0)::int AS month
    FROM visits_daily WHERE day > current_date - 30`;
  return row;
}

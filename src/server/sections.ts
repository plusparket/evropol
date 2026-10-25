// Разделы сайта (Линолеум, Ковролин …) и бренды в них.
// Главный сайт — визитка без товаров. Раздел ведёт на свой сайт: либо сайт раздела в этом же приложении
// (поле site_host, каталог товаров — src/server/products.ts), либо любой другой адрес (поле link).
import { sql } from './db.ts';

export type Section = {
  id: number; slug: string; name: string; heading: string; summary: string; description: string; image: string;
  link: string; linkLabel: string; seoTitle: string; seoDescription: string; sortOrder: number; isPublished: boolean;
  /** Адрес сайта раздела без http:// (vinyl.localhost); пусто — своего сайта нет */
  siteHost: string;
  /** Основной цвет сайта раздела; пусто — зелёный логотипа */
  siteColor: string;
  updatedAt: Date;
};
export type Brand = {
  id: number; sectionId: number | null; name: string; logo: string; description: string; link: string;
  sortOrder: number; isActive: boolean;
};

/** Адрес страницы раздела на этом сайте */
export const sectionUrl = (s: Pick<Section, 'slug'>) => `/${s.slug}`;
/** Подпись кнопки перехода на сайт раздела */
export const linkLabel = (s: Pick<Section, 'linkLabel'>) => s.linkLabel || 'Перейти на сайт раздела';
/** Зелёный логотипа ЕвроПол — цвет сайта раздела, если в админке свой не задан */
export const DEFAULT_SITE_COLOR = '#006338';

/** Адрес сайта раздела: http для *.localhost (компьютер владельца), https для настоящих доменов */
export const siteUrl = (s: Pick<Section, 'siteHost'>) =>
  s.siteHost ? `${/(^|\.)localhost$/i.test(s.siteHost) ? 'http' : 'https'}://${s.siteHost}` : '';
/** Куда ведёт раздел: на свой сайт, иначе на ссылку из админки */
export const sectionLink = (s: Pick<Section, 'siteHost' | 'link'>) => siteUrl(s) || s.link;
/** Пункт меню и плитка раздела на главном сайте: сразу на сайт раздела, если он есть, иначе на страницу раздела */
export const sectionHref = (s: Pick<Section, 'siteHost' | 'slug'>) => siteUrl(s) || sectionUrl(s);
/** Адрес без порта и в нижнем регистре: так он хранится в site_host */
export const normalizeHost = (host: string) => host.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[:/].*$/, '');

/** Ссылка ведёт на другой сайт — открываем в новой вкладке */
export const isExternal = (url: string) => /^https?:\/\//i.test(url);

export async function getSections({ publishedOnly = false } = {}): Promise<Section[]> {
  return publishedOnly
    ? sql<Section[]>`SELECT * FROM sections WHERE is_published ORDER BY sort_order, id`
    : sql<Section[]>`SELECT * FROM sections ORDER BY sort_order, id`;
}

export async function getSectionBySlug(slug: string): Promise<Section | undefined> {
  const [s] = await sql<Section[]>`SELECT * FROM sections WHERE slug = ${slug} AND is_published`;
  return s;
}

/** Опубликованный раздел, у которого свой сайт по этому адресу (Host запроса) */
export async function getSectionByHost(host: string): Promise<Section | undefined> {
  const h = normalizeHost(host);
  if (!h || !h.includes('.')) return undefined;
  const [s] = await sql<Section[]>`SELECT * FROM sections WHERE site_host <> '' AND lower(site_host) = ${h} AND is_published`;
  return s;
}

/** Бренды, которые видны на сайте: включённые, без раздела или в опубликованном разделе */
export async function getActiveBrands(sectionId?: number): Promise<Brand[]> {
  if (sectionId) return sql<Brand[]>`SELECT * FROM brands WHERE is_active AND section_id = ${sectionId} ORDER BY sort_order, id`;
  return sql<Brand[]>`
    SELECT b.* FROM brands b LEFT JOIN sections s ON s.id = b.section_id
    WHERE b.is_active AND (b.section_id IS NULL OR s.is_published)
    ORDER BY s.sort_order NULLS LAST, b.sort_order, b.id`;
}

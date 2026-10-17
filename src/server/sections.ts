// Разделы сайта (Винил, Ковровая плитка …) и бренды в них.
// Сайт-визитка: товаров здесь нет, каждый раздел ведёт на свой сайт или страницу (поле link).
import { sql } from './db.ts';

export type Section = {
  id: number; slug: string; name: string; heading: string; summary: string; description: string; image: string;
  link: string; linkLabel: string; seoTitle: string; seoDescription: string; sortOrder: number; isPublished: boolean;
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

/** Бренды, которые видны на сайте: включённые, без раздела или в опубликованном разделе */
export async function getActiveBrands(sectionId?: number): Promise<Brand[]> {
  if (sectionId) return sql<Brand[]>`SELECT * FROM brands WHERE is_active AND section_id = ${sectionId} ORDER BY sort_order, id`;
  return sql<Brand[]>`
    SELECT b.* FROM brands b LEFT JOIN sections s ON s.id = b.section_id
    WHERE b.is_active AND (b.section_id IS NULL OR s.is_published)
    ORDER BY s.sort_order NULLS LAST, b.sort_order, b.id`;
}

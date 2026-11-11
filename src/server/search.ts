// Поиск по сайту (владелец, 10.11.2026): поле «Поиск по сайту» в шапке, страница /search?q=…
// Ищет во всём, что видно на сайте: товары каталогов (название, коллекция, артикул, характеристики, описание, название
// раздела), разделы, страницы (в том числе «Укладка и уход»), новости. Скрытое не ищется.
// Каждое слово запроса должно найтись; у длинных слов отрезается окончание («плитку» находит «плитка», «плитки»).
import type { PendingQuery, Row } from 'postgres';
import { sql } from './db.ts';
import { catalogPath, getSections, sectionHref, type Section } from './sections.ts';
import { pagePath } from './section-guides.ts';
import { productThumb } from './products.ts';
import { plainText } from './util.ts';

export const SEARCH_PAGE_SIZE = 48;

export type SearchProduct = { name: string; collection: string; href: string; image: string; section: string };
export type SearchLink = { title: string; href: string; text: string; external?: boolean };
export type SearchResult = {
  query: string;
  products: SearchProduct[];
  productTotal: number;
  sections: SearchLink[];
  pages: SearchLink[];
  news: SearchLink[];
};

const ENDINGS = /(ами|ями|ого|его|ому|ему|ыми|ими|ов|ев|ей|ом|ем|ах|ях|ую|юю|ая|яя|ое|ее|ые|ие|ый|ий|ой|ам|ям|а|я|ы|и|о|е|у|ю|ь|й)$/;

/** Слова запроса: нижний регистр, ё → е, без окончаний у слов от 5 букв (основа не короче 4 букв) */
export function searchWords(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8)
    .map((w) => {
      if (w.length < 5 || !/^\p{L}+$/u.test(w)) return w;
      const stem = w.replace(ENDINGS, '');
      return stem.length >= 4 ? stem : w;
    });
}

/** Условие «текст содержит все слова» для SQL: lower + ё→е, слова экранированы для LIKE */
type Frag = PendingQuery<Row[]>;
const likeAll = (doc: Frag, words: string[]): Frag =>
  words.reduce(
    (acc, w) => sql`${acc} AND ${doc} LIKE ${'%' + w.replace(/[\\%_]/g, (c) => '\\' + c) + '%'}`,
    sql`TRUE`,
  );
const norm = (expr: Frag): Frag => sql`translate(lower(${expr}), 'ё', 'е')`;

export async function siteSearch(query: string, page = 1): Promise<SearchResult> {
  const q = query.trim().slice(0, 100);
  const empty: SearchResult = { query: q, products: [], productTotal: 0, sections: [], pages: [], news: [] };
  const words = searchWords(q);
  if (!words.length) return empty;
  const sections = await getSections({ publishedOnly: true });
  const bySlug = new Map(sections.map((s) => [s.slug, s]));

  const productDoc = norm(sql`s.name || ' ' || s.heading || ' ' || p.name || ' ' || p.collection || ' ' || p.sku || ' ' || p.specs::text || ' ' || p.description`);
  const nameDoc = norm(sql`p.name || ' ' || p.collection`);
  const where = sql`p.is_published AND s.is_published AND s.site_host <> '' AND ${likeAll(productDoc, words)}`;
  const offset = (Math.max(1, page) - 1) * SEARCH_PAGE_SIZE;
  const [rows, [{ n }]] = await Promise.all([
    sql<{ slug: string; name: string; collection: string; images: string[]; sectionSlug: string }[]>`
      SELECT p.slug, p.name, p.collection, p.images, s.slug AS section_slug
      FROM products p JOIN sections s ON s.id = p.section_id
      WHERE ${where}
      ORDER BY (${likeAll(nameDoc, words)}) DESC, p.in_stock DESC, s.sort_order, p.sort_order, p.id
      LIMIT ${SEARCH_PAGE_SIZE} OFFSET ${offset}`,
    sql<{ n: number }[]>`SELECT count(*)::int AS n FROM products p JOIN sections s ON s.id = p.section_id WHERE ${where}`,
  ]);
  const products = rows.flatMap((r) => {
    const s = bySlug.get(r.sectionSlug);
    if (!s) return [];
    return [{ name: r.name, collection: r.collection, href: catalogPath(s, r.slug), image: r.images[0] ? productThumb(r.images[0]) : '', section: s.name }];
  });

  const sectionDoc = (s: Section) => [s.name, s.heading, s.summary, plainText(s.description, 100000)].join(' ').toLowerCase().replace(/ё/g, 'е');
  const sectionHits = sections
    .filter((s) => words.every((w) => sectionDoc(s).includes(w)))
    .map((s) => ({ title: s.name, href: sectionHref(s), text: s.summary, external: /^https?:/i.test(sectionHref(s)) }));

  const [pageRows, newsRows] = await Promise.all([
    sql<{ slug: string; title: string; content: string }[]>`
      SELECT slug, title, content FROM pages
      WHERE is_published AND ${likeAll(norm(sql`title || ' ' || content`), words)}
      ORDER BY (${likeAll(norm(sql`title`), words)}) DESC, id LIMIT 30`,
    sql<{ slug: string; title: string; excerpt: string; content: string }[]>`
      SELECT slug, title, excerpt, content FROM news
      WHERE is_published AND published_at <= now() AND slug IS NOT NULL
        AND ${likeAll(norm(sql`title || ' ' || excerpt || ' ' || content`), words)}
      ORDER BY published_at DESC LIMIT 20`,
  ]);
  // Слова ищутся и в HTML-разметке: оставляем только страницы, где слова есть в видимом тексте
  const visible = (html: string) => {
    const t = plainText(html, 100000).toLowerCase().replace(/ё/g, 'е');
    return words.every((w) => t.includes(w));
  };
  const pages = pageRows
    .filter((p) => visible(`${p.title} ${p.content}`))
    .map((p) => ({ title: p.title, href: pagePath(p.slug, sections), text: plainText(p.content, 180) }));
  const news = newsRows
    .filter((n) => visible(`${n.title} ${n.excerpt} ${n.content}`))
    .map((n) => ({ title: n.title, href: `/news/${n.slug}`, text: plainText(n.excerpt || n.content, 180) }));

  return { query: q, products, productTotal: n, sections: sectionHits, pages, news };
}

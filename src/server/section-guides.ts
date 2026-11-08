// «Укладка и уход» в каталоге раздела: две текстовые страницы, /linoleum/ukladka и /linoleum/uhod.
// Тексты хранятся как обычные страницы (админка → «Страницы») с адресом <раздел>-<подраздел>: linoleum-ukladka,
// linoleum-uhod. Показываются по адресу внутри каталога, а в шапке каталога пункт «Укладка и уход» с двумя
// подразделами встаёт вместо «Новости и события». Нет страницы или она скрыта — нет и пункта меню.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db.ts';
import { catalogPath, type Section } from './sections.ts';

export const GUIDES_LABEL = 'Укладка и уход';
/** Подразделы: адрес внутри каталога и подпись в меню */
export const GUIDES = [
  { key: 'ukladka', label: 'Укладка' },
  { key: 'uhod', label: 'Уход' },
] as const;

export type Guide = { key: string; label: string; url: string; title: string; content: string; seoTitle: string; seoDescription: string; updatedAt: Date };

const pageSlug = (sectionSlug: string, key: string) => `${sectionSlug}-${key}`;

/** Опубликованные страницы «Укладка и уход» раздела, в порядке меню */
export async function getSectionGuides(section: Pick<Section, 'slug'>): Promise<Guide[]> {
  const slugs = GUIDES.map((g) => pageSlug(section.slug, g.key));
  const rows = await sql<{ slug: string; title: string; content: string; seoTitle: string; seoDescription: string; updatedAt: Date }[]>`
    SELECT slug, title, content, seo_title, seo_description, updated_at FROM pages WHERE is_published AND slug = ANY(${slugs})`;
  return GUIDES.flatMap((g) => {
    const p = rows.find((r) => r.slug === pageSlug(section.slug, g.key));
    return p ? [{ ...p, key: g.key, label: g.label, url: catalogPath(section, g.key) }] : [];
  });
}

/** Адрес страницы на сайте: страница «Укладка и уход» раздела с каталогом — /linoleum/ukladka, остальные — /<адрес> */
export function pagePath(slug: string, sections: Pick<Section, 'slug' | 'siteHost'>[]): string {
  for (const s of sections) {
    if (!s.siteHost) continue;
    const g = GUIDES.find((x) => slug === pageSlug(s.slug, x.key));
    if (g) return catalogPath(s, g.key);
  }
  return `/${slug}`;
}

/** Стартовые страницы (seed/pages/<адрес>.html, заголовок — в первой строке <!-- title: … -->) */
const SEEDED: { slug: string; seoDescription: string }[] = [
  { slug: 'linoleum-ukladka', seoDescription: 'Как уложить линолеум на клей: инструменты, пять шагов укладки, сварка швов и первые 72 часа после укладки.' },
  { slug: 'linoleum-uhod', seoDescription: 'Уход за линолеумом: ежедневная уборка, какие средства подходят и какие нет, коврики у входа и защитный слой PU.' },
];
const FLAG = 'guides_linoleum_2026_11_08';

/** Один раз создаёт страницы «Укладка» и «Уход» для линолеума. Возвращает список изменений для журнала запуска. */
export async function upgradeGuides(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return [];
  const log: string[] = [];
  await sql.begin(async (tx) => {
    for (const s of SEEDED) {
      const raw = (await readFile(path.resolve(process.cwd(), 'seed', 'pages', `${s.slug}.html`), 'utf8')).trim();
      const m = raw.match(/^<!--\s*title:\s*(.+?)\s*-->\s*/);
      const title = m?.[1] ?? s.slug;
      const html = m ? raw.slice(m[0].length) : raw;
      const res = await tx`INSERT INTO pages (slug, title, content, seo_description, is_published)
                           VALUES (${s.slug}, ${title}, ${html}, ${s.seoDescription}, true) ON CONFLICT (slug) DO NOTHING`;
      if (res.count) log.push(`страница «${title}»`);
    }
    await tx`INSERT INTO settings (key, value) VALUES (${FLAG}, '1') ON CONFLICT (key) DO NOTHING`;
  });
  return log;
}

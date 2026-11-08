// «Укладка и уход» в каталоге раздела: две текстовые страницы, /linoleum/ukladka и /linoleum/uhod
// (так же /carpet-tiles/… и /vinyl/ukladka, /vinyl/uhod).
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

/** Стартовые страницы (seed/pages/<адрес>.html, заголовок — в первой строке <!-- title: … -->).
 *  Каждая группа создаётся один раз, по своей отметке в settings: удалённую в админке страницу запуск не вернёт.
 *  overwrite: при первом запуске с этой отметкой заменить текст уже созданной страницы (новая вёрстка). */
type SeedPage = { slug: string; seoTitle?: string; seoDescription: string };
const SEEDED: { flag: string; overwrite?: boolean; pages: SeedPage[] }[] = [
  {
    flag: 'guides_linoleum_2026_11_08',
    pages: [
      { slug: 'linoleum-ukladka', seoDescription: 'Как уложить линолеум на клей: инструменты, пять шагов укладки, сварка швов и первые 72 часа после укладки.' },
      { slug: 'linoleum-uhod', seoDescription: 'Уход за линолеумом: ежедневная уборка, какие средства подходят и какие нет, коврики у входа и защитный слой PU.' },
    ],
  },
  {
    // Вёрстка как у страниц производителя: блоки «текст + картинка», карточки в две колонки
    flag: 'guides_carpet_tiles_v3_2026_11_08',
    overwrite: true,
    pages: [
      {
        slug: 'carpet-tiles-ukladka',
        seoTitle: 'Укладка ковровой плитки: общие правила | ЕвроПол',
        seoDescription: 'Как уложить ковровую плитку: хранение, подготовка основания, фиксатор вместо клея, разметка, резка и шесть схем укладки.',
      },
      {
        slug: 'carpet-tiles-uhod',
        seoTitle: 'Уход за ковровой плиткой и чистка | ЕвроПол',
        seoDescription: 'Уход за ковровой плиткой: выбор цвета, пылесос, как вывести пятна, глубокая чистка два-три раза в год.',
      },
    ],
  },
  {
    // SPC и LVT: вёрстка как у страниц производителя (первый экран «фото + заголовок», шаги, полоса с колонками),
    // в конце блок «Свяжитесь с нами» с кнопкой WhatsApp
    flag: 'guides_vinyl_2026_11_08',
    overwrite: true,
    pages: [
      {
        slug: 'vinyl-ukladka',
        seoTitle: 'Укладка SPC и LVT: подготовка и советы | ЕвроПол',
        seoDescription: 'Как уложить виниловую плитку SPC и LVT: температура, основание, влажность, тёплый пол, зазор 10 мм и укладка на клей.',
      },
      {
        slug: 'vinyl-uhod',
        seoTitle: 'Уход за SPC и LVT: уборка и пятна | ЕвроПол',
        seoDescription: 'Уход за виниловой плиткой: уборка после ремонта, ежедневная и генеральная уборка, чем вывести пятна, защита от грязи.',
      },
    ],
  },
];

/** Один раз создаёт страницы «Укладка» и «Уход» разделов. Возвращает список изменений для журнала запуска. */
export async function upgradeGuides(): Promise<string[]> {
  const log: string[] = [];
  for (const group of SEEDED) {
    const [done] = await sql`SELECT 1 FROM settings WHERE key = ${group.flag}`;
    if (done) continue;
    await sql.begin(async (tx) => {
      for (const s of group.pages) {
        const raw = (await readFile(path.resolve(process.cwd(), 'seed', 'pages', `${s.slug}.html`), 'utf8')).trim();
        const m = raw.match(/^<!--\s*title:\s*(.+?)\s*-->\s*/);
        const title = m?.[1] ?? s.slug;
        const html = m ? raw.slice(m[0].length) : raw;
        const seoTitle = s.seoTitle ?? '';
        const res = group.overwrite
          ? await tx`INSERT INTO pages (slug, title, content, seo_title, seo_description, is_published)
                     VALUES (${s.slug}, ${title}, ${html}, ${seoTitle}, ${s.seoDescription}, true)
                     ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content,
                       seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, updated_at = now()`
          : await tx`INSERT INTO pages (slug, title, content, seo_title, seo_description, is_published)
                     VALUES (${s.slug}, ${title}, ${html}, ${seoTitle}, ${s.seoDescription}, true) ON CONFLICT (slug) DO NOTHING`;
        if (res.count) log.push(`страница «${title}»`);
      }
      await tx`INSERT INTO settings (key, value) VALUES (${group.flag}, '1') ON CONFLICT (key) DO NOTHING`;
    });
  }
  return log;
}

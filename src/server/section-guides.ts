// «Укладка и уход» в каталоге раздела: две текстовые страницы, /linoleum/ukladka и /linoleum/uhod
// (так же /carpet-tiles/…, /vinyl/…, /carpet/…, /laminate/…; /adhesives/ukladka скрыта владельцем 12.11.2026).
// Тексты хранятся как обычные страницы (админка → «Страницы») с адресом <раздел>-<подраздел>: linoleum-ukladka,
// linoleum-uhod. Показываются по адресу внутри каталога, а в шапке каталога пункт «Укладка и уход» с двумя
// подразделами встаёт вместо «Новости и события». Нет страницы или она скрыта — нет и пункта меню.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db.ts';
import { catalogPath, type Section } from './sections.ts';

export const GUIDES_LABEL = 'Укладка и уход';
/** Подпись пункта меню: у раздела с одной страницей — её название («Укладка» у строительной химии, у неё нет ухода) */
export const guidesLabel = (guides: { label: string }[]) => (guides.length === 1 ? guides[0].label : GUIDES_LABEL);
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
    // Вёрстка как у страниц производителя: «Укладка» по шагам в карточках (gs), «Уход» блоками «текст + картинка» (gd)
    flag: 'guides_carpet_tiles_v4_2026_11_08',
    overwrite: true,
    pages: [
      {
        slug: 'carpet-tiles-ukladka',
        seoTitle: 'Как уложить ковровую плитку: пять шагов | ЕвроПол',
        seoDescription: 'Как уложить ковровую плитку: проверка товара, подготовка помещения, фиксатор, направление ворса и четыре схемы укладки, защита во время ремонта.',
      },
      {
        slug: 'carpet-tiles-uhod',
        seoTitle: 'Уход за ковровой плиткой и чистка | ЕвроПол',
        seoDescription: 'Уход за ковровой плиткой: выбор цвета, пылесос, как вывести пятна, глубокая чистка два-три раза в год.',
      },
    ],
  },
  {
    // Владелец 11.11.2026: «Укладка» ковровой плитки без рисунков, только текст (меняется одна эта страница)
    flag: 'guides_carpet_tiles_ukladka_v5_2026_11_11',
    overwrite: true,
    pages: [
      {
        slug: 'carpet-tiles-ukladka',
        seoTitle: 'Как уложить ковровую плитку: пять шагов | ЕвроПол',
        seoDescription: 'Как уложить ковровую плитку: проверка товара, подготовка помещения, фиксатор, направление ворса и четыре схемы укладки, защита во время ремонта.',
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
  {
    // Ковролин: вёрстка как у страниц производителя ковролина (заголовок прописными, текст слева, фото справа,
    // раскрывающиеся плашки «Подробнее»), в конце блок «Свяжитесь с нами» с кнопкой WhatsApp
    flag: 'guides_carpet_2026_11_09',
    overwrite: true,
    pages: [
      {
        slug: 'carpet-ukladka',
        seoTitle: 'Как уложить ковролин: советы мастера | ЕвроПол',
        seoDescription: 'Как уложить ковролин: инструменты, замеры, подготовка основания, подложка, крепление на рейки, клей или скотч, направление ворса.',
      },
      {
        slug: 'carpet-uhod',
        seoTitle: 'Уход за ковролином: уборка и пятна | ЕвроПол',
        seoDescription: 'Уход за ковролином: пылесос два раза в неделю, как вывести пятна и воск, какой пылесос выбрать, когда заказывать глубокую чистку.',
      },
    ],
  },
  {
    // Ламинат и строительная химия (SEO, 10.11.2026): свои тексты по скиллу stop-slop, без брендов, без фото.
    // У строительной химии одна страница: подготовка основания и нанесение клея (/adhesives/ukladka)
    flag: 'guides_laminate_adhesives_2026_11_10',
    pages: [
      {
        slug: 'laminate-ukladka',
        seoTitle: 'Как уложить ламинат: шесть шагов | ЕвроПол',
        seoDescription: 'Как уложить ламинат: акклиматизация 48 часов, проверка основания, плёнка и подложка, зазор 8–10 мм у стен, разбежка рядов, тёплый пол.',
      },
      {
        slug: 'laminate-uhod',
        seoTitle: 'Уход за ламинатом: уборка и пятна | ЕвроПол',
        seoDescription: 'Уход за ламинатом: чем мыть, почему нельзя пароочиститель, как вывести пятна маркера и воска, войлочные накладки и влажность 40–60 %.',
      },
      {
        slug: 'adhesives-ukladka',
        seoTitle: 'Подготовка основания под линолеум, винил и паркет | ЕвроПол',
        seoDescription: 'Подготовка основания под покрытие: проверка прочности и влажности стяжки, грунтовка, наливной пол, сушка и выбор клея.',
      },
    ],
  },
  {
    // Ламинат v2 (владелец, 10.11.2026): тексты по официальным инструкциям производителей ламината (укладка и уход),
    // обобщены для всех коллекций, без названий брендов и их особых отличий. Заменяет прежние тексты.
    flag: 'guides_laminate_v2_2026_11_10',
    overwrite: true,
    pages: [
      {
        slug: 'laminate-ukladka',
        seoTitle: 'Как уложить ламинат: инструкция | ЕвроПол',
        seoDescription: 'Как уложить ламинат: 24 часа в комнате, влажность стяжки, плёнка 0,2 мм внахлёст 30 см, зазор 10–15 мм, разбежка рядов, тёплый пол до +29 °C.',
      },
      {
        slug: 'laminate-uhod',
        seoTitle: 'Уход за ламинатом: уборка и пятна | ЕвроПол',
        seoDescription: 'Уход за ламинатом: коврик и войлочные накладки, влажность 40–60 %, уборка раз в неделю и раз в месяц, чем вывести пятна, чего нельзя.',
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
  // Владелец, 12.11.2026: у строительной химии вкладка «Укладка» не нужна. Страница скрывается один раз и остаётся
  // в админке («Страницы» → adhesives-ukladka): если её снова опубликовать, вкладка вернётся.
  const hideFlag = 'guides_adhesives_hidden_2026_11_12';
  const [hidden] = await sql`SELECT 1 FROM settings WHERE key = ${hideFlag}`;
  if (!hidden) {
    await sql.begin(async (tx) => {
      const res = await tx`UPDATE pages SET is_published = false, updated_at = now() WHERE slug = 'adhesives-ukladka' AND is_published`;
      if (res.count) log.push('скрыта страница «Укладка» строительной химии');
      await tx`INSERT INTO settings (key, value) VALUES (${hideFlag}, '1') ON CONFLICT (key) DO NOTHING`;
    });
  }
  return log;
}

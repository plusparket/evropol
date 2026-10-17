import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db.ts';
import { saveSettings, SETTINGS_SCHEMA, type Settings } from './settings.ts';
import { DEFAULT_HOME, saveHome } from './home.ts';

const SEED_DIR = path.resolve(process.cwd(), 'seed');

type SeedContent = {
  sections: { slug: string; name: string; heading?: string; summary?: string; description?: string; link?: string }[];
  brands: { section: string; name: string; link?: string; description?: string }[];
  menus: Record<'top' | 'footer_company', { label: string; url: string }[]>;
  pages: { slug: string; title: string; published?: boolean }[];
  news: { slug: string; title: string; date: string; excerpt?: string; content?: string }[];
  redirects?: { from: string; to: string; note?: string }[];
};

export async function isDatabaseEmpty(): Promise<boolean> {
  const [{ count }] = await sql<{ count: number }[]>`
    SELECT (SELECT count(*) FROM sections) + (SELECT count(*) FROM pages) AS count`;
  return Number(count) === 0;
}

/**
 * Заполняет пустую базу контентом со старого сайта europroject.kg: разделы и бренды (со ссылками на коллекции
 * производителей), страницы «О компании» и «Контакты», новости, меню, переадресации со старых адресов.
 */
export async function seed(log: (msg: string) => void = console.log): Promise<void> {
  const content = JSON.parse(await readFile(path.join(SEED_DIR, 'content.json'), 'utf8')) as SeedContent;

  await sql.begin(async (tx) => {
    const sectionIds = new Map<string, number>();
    for (const [i, s] of content.sections.entries()) {
      const [row] = await tx<{ id: number }[]>`
        INSERT INTO sections (slug, name, heading, summary, description, link, sort_order)
        VALUES (${s.slug}, ${s.name}, ${s.heading ?? ''}, ${s.summary ?? ''}, ${s.description ?? ''}, ${s.link ?? ''}, ${(i + 1) * 10})
        RETURNING id`;
      sectionIds.set(s.slug, row.id);
    }
    log(`разделов: ${sectionIds.size}`);

    for (const [i, b] of content.brands.entries()) {
      const sectionId = sectionIds.get(b.section);
      if (!sectionId) throw new Error(`Нет раздела ${b.section} для бренда ${b.name}`);
      await tx`
        INSERT INTO brands (section_id, name, description, link, sort_order)
        VALUES (${sectionId}, ${b.name}, ${b.description ?? ''}, ${b.link ?? ''}, ${(i + 1) * 10})`;
    }
    log(`брендов: ${content.brands.length}`);

    for (const [menu, items] of Object.entries(content.menus)) {
      for (const [i, item] of items.entries()) {
        await tx`INSERT INTO menu_items (menu, label, url, sort_order) VALUES (${menu}, ${item.label}, ${item.url}, ${(i + 1) * 10})`;
      }
    }

    for (const page of content.pages) {
      const html = (await readFile(path.join(SEED_DIR, 'pages', `${page.slug}.html`), 'utf8')).trim();
      await tx`INSERT INTO pages (slug, title, content, is_published) VALUES (${page.slug}, ${page.title}, ${html}, ${page.published ?? true})`;
    }
    log(`страниц: ${content.pages.length}`);

    for (const n of content.news) {
      await tx`
        INSERT INTO news (slug, title, excerpt, content, published_at)
        VALUES (${n.slug}, ${n.title}, ${n.excerpt ?? ''}, ${n.content ?? ''}, ${n.date})`;
    }
    log(`новостей: ${content.news.length}`);

    for (const r of content.redirects ?? []) {
      await tx`INSERT INTO redirects (from_path, to_path, note) VALUES (${r.from}, ${r.to}, ${r.note ?? ''})`;
    }
    log(`переадресаций со старых адресов: ${content.redirects?.length ?? 0}`);
  });

  const defaults = Object.fromEntries(SETTINGS_SCHEMA.map((s) => [s.key, s.default])) as Settings;
  await saveSettings(defaults);
  await saveHome(structuredClone(DEFAULT_HOME));
  log('стартовый контент загружен');
}

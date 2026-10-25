// Разделы по списку владельца от 25.10.2026: Линолеум, Ковролин, Ковровая плитка, SPC / LVT / кварцвинил, Ламинат.
// Один раз при запуске переводит уже заполненную базу на новый список: переименовывает «Винил» и «Коммерческий
// линолеум», добавляет «Ковролин» и «Ламинат», скрывает «Строительную химию» и «Террасную доску» (не удаляет:
// их можно снова включить в админке). Тексты, изменённые в админке, не трогает. Новая база сразу заполняется
// новым списком из seed/content.json.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db.ts';
import { DEFAULT_HOME, getHome, saveHome } from './home.ts';
import { SETTINGS_SCHEMA } from './settings.ts';

const FLAG = 'sections_layout';
const SEED_DIR = path.resolve(process.cwd(), 'seed');

type SeedSection = { slug: string; name: string; heading?: string; summary?: string; description?: string };
type SeedBrand = { section: string; name: string; link?: string; description?: string };

// Тексты первой версии сайта: если они в базе не менялись, ставим новые
const OLD_SECTIONS: Record<string, Partial<SeedSection>> = {
  vinyl: {
    name: 'Винил',
    heading: 'Виниловые полы',
    summary: 'Кварцвиниловая плитка и доска Moduleo и BerryAlloc для квартир, офисов и магазинов.',
    description: '<p>Виниловый пол не боится воды, поэтому его кладут на кухне, в ванной, в прихожей и в торговом зале. Moduleo и BerryAlloc выпускают плитку и доску с рисунком дерева и камня.</p>',
  },
  linoleum: { name: 'Коммерческий линолеум' },
};
const HIDDEN = ['adhesives', 'decking'];
const OLD_SETTINGS: Record<string, string> = {
  seo_title: 'Европроект: винил, ковровая плитка, коммерческий линолеум в Бишкеке',
  seo_description: 'Европроект поставляет в Кыргызстан напольные покрытия Moduleo, BerryAlloc, Modulyss, Betap, IVC Commercial, BLOQ и клеи Forbo Eurocol: винил, ковровую плитку, коммерческий линолеум, террасную доску. Бишкек, ул. Токтогула 125/1, БЦ «Авангард».',
};
const OLD_HOME_ABOUT =
  '<p>Мы поставляем в Кыргызстан напольные покрытия Moduleo, BerryAlloc, Modulyss, Betap, IVC Commercial, BLOQ ' +
  'и клеи Forbo Eurocol. Подбираем покрытие под объект: офис, магазин, гостиницу, школу, квартиру.</p>' +
  '<p>Офис: {{address}}. Телефон и WhatsApp: {{phone_main}}.</p>';
// Признак старой страницы «О компании»: ссылки на скрытые разделы
const OLD_ABOUT_MARK = '<a href="/adhesives">Строительная химия</a>';

/** Возвращает список изменений для журнала запуска (пустой — ничего не менялось). */
export async function upgradeSections(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG} AND value = '2'`;
  if (done) return [];
  const seed = JSON.parse(await readFile(path.join(SEED_DIR, 'content.json'), 'utf8')) as { sections: SeedSection[]; brands: SeedBrand[] };
  const log: string[] = [];

  await sql.begin(async (tx) => {
    for (const [i, s] of seed.sections.entries()) {
      const order = (i + 1) * 10;
      const [cur] = await tx<{ id: number; name: string; heading: string; summary: string; description: string }[]>`
        SELECT id, name, heading, summary, description FROM sections WHERE slug = ${s.slug}`;
      if (!cur) {
        const [row] = await tx<{ id: number }[]>`
          INSERT INTO sections (slug, name, heading, summary, description, sort_order)
          VALUES (${s.slug}, ${s.name}, ${s.heading ?? ''}, ${s.summary ?? ''}, ${s.description ?? ''}, ${order})
          RETURNING id`;
        for (const [j, b] of seed.brands.filter((b) => b.section === s.slug).entries()) {
          await tx`INSERT INTO brands (section_id, name, description, link, sort_order)
                   VALUES (${row.id}, ${b.name}, ${b.description ?? ''}, ${b.link ?? ''}, ${(j + 1) * 10})`;
        }
        log.push(`добавлен раздел «${s.name}»`);
        continue;
      }
      const old = OLD_SECTIONS[s.slug] ?? {};
      const pick = (k: 'name' | 'heading' | 'summary' | 'description') =>
        old[k] !== undefined && cur[k] === old[k] ? (s[k] ?? '') : cur[k];
      const next = { name: pick('name'), heading: pick('heading'), summary: pick('summary'), description: pick('description') };
      await tx`UPDATE sections SET name = ${next.name}, heading = ${next.heading}, summary = ${next.summary},
               description = ${next.description}, sort_order = ${order}, is_published = true, updated_at = now()
               WHERE id = ${cur.id}`;
      if (next.name !== cur.name) log.push(`«${cur.name}» → «${next.name}»`);
    }

    const hidden = await tx<{ name: string }[]>`
      UPDATE sections SET is_published = false, sort_order = sort_order + 100, updated_at = now() WHERE slug IN ${tx(HIDDEN)} AND is_published RETURNING name`;
    for (const h of hidden) log.push(`скрыт раздел «${h.name}»`);

    for (const [key, old] of Object.entries(OLD_SETTINGS)) {
      const fresh = SETTINGS_SCHEMA.find((s) => s.key === key)?.default ?? old;
      await tx`UPDATE settings SET value = ${fresh} WHERE key = ${key} AND value = ${old}`;
    }

    const html = (await readFile(path.join(SEED_DIR, 'pages', 'about.html'), 'utf8')).trim();
    const about = await tx`UPDATE pages SET content = ${html}, updated_at = now()
                           WHERE slug = 'about' AND position(${OLD_ABOUT_MARK} in content) > 0`;
    if (about.count) log.push('страница «О компании» обновлена');

    await tx`INSERT INTO settings (key, value) VALUES (${FLAG}, '2') ON CONFLICT (key) DO UPDATE SET value = '2'`;
  });

  const home = await getHome();
  if (home.about.text === OLD_HOME_ABOUT) {
    home.about.text = DEFAULT_HOME.about.text;
    await saveHome(home);
  }
  return log;
}

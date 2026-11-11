// Новая страница «О компании» по тексту владельца от 06.11.2026: история с 2000 года, прямые поставки, обучение
// на заводах, работа с архитекторами и крупными объектами, три магазина. Названий брендов на странице нет.
// Один раз при запуске ставит текст из seed/pages/about.html вместо прежней страницы (со списком производителей)
// и прежний текст блока «О компании» главной. На страницу «Контакты» добавляет два других магазина (салон
// «Дом Паркета» и магазин на рынке «ЭлитСтрой»). Тексты, переписанные в админке, не трогает.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db.ts';
import { DEFAULT_HOME, getHome, saveHome } from './home.ts';

const FLAG = 'about_2026_11_06';
/** 11.11.2026: текст по образцу domparketa.kg, заводы Бельгии, Нидерландов и Германии с фото (без названий брендов) */
const FLAG_COUNTRIES = 'about_countries_2026_11_11';
const ABOUT_SEO_TITLE = 'О компании ЕвроПол: напольные покрытия из Европы в Бишкеке';
export const ABOUT_SEO_DESC =
  'ЕвроПол с 2000 года везёт в Бишкек линолеум, ковролин, ламинат и клеи с заводов Бельгии, Нидерландов и Германии. ' +
  'Три магазина, тел. +996 (779) 37 72 73.';
/** Описание страницы для Google от 11.11.2026 (до нового текста): заменяем, если его не меняли в админке */
const OLD_ABOUT_SEO_DESC =
  'ЕвроПол продаёт напольные покрытия в Бишкеке с 2000 года и везёт товар с заводов Европы. ' +
  'Магазины на ул. Матросова 6/1, Шабдан Баатыра 354 и в ЭлитСтрое.';
const CONTACT_FLAG = 'contact_shops_2026_11_06';
/** Текст «Контактов» от 05.11.2026 (один магазин): если его не меняли в админке, ставим список из трёх магазинов */
const OLD_CONTACT_PAGE = `<p><b>Магазин «{{site_name}}»:</b><br>
{{address}}<br>
Телефон: <a href="tel:{{phone_main}}">{{phone_main}}</a><br>
Режим работы: {{work_hours}}</p>
<p>WhatsApp: {{panel_whatsapp}}<br>
Email: <a href="mailto:{{email}}">{{email}}</a></p>`;
/** Адрес салона «Дом Паркета» уточнён владельцем 06.11.2026: строительный комплекс «Монолит» */
const OLD_SALON = 'г. Бишкек, ул. Шабдан Баатыра 354, бутик Д4';
const NEW_SALON = 'г. Бишкек, строительный комплекс «Монолит», ул. Шабдан Баатыра, 354, бутик Д4';
const norm = (t: string) => t.replace(/\s+/g, ' ').trim();
/** Признаки прежних версий страницы: первая фраза и блок «Производители» */
const OLD_ABOUT_MARKS = ['напольные покрытия европейских производителей', '<h2>Производители</h2>'];
/** Прежний текст блока «О компании» на главной (с названием до 05.11.2026 и после) */
const OLD_HOME_ABOUT_START = '<p>Мы поставляем в Кыргызстан напольные покрытия IVC Commercial, Moduleo, BerryAlloc, Modulyss, Betap и BLOQ.';

/** Возвращает список изменений для журнала запуска. */
export async function upgradeAbout(): Promise<string[]> {
  const log = await upgradeContactShops();
  log.push(...(await upgradeAboutCountries()));
  const fixed = await sql`UPDATE pages SET content = replace(content, ${OLD_SALON}, ${NEW_SALON}), updated_at = now()
                          WHERE slug IN ('about', 'contact') AND position(${OLD_SALON} in content) > 0`;
  if (fixed.count) log.push('адрес салона «Дом Паркета»: строительный комплекс «Монолит»');
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return log;
  const html = (await readFile(path.resolve(process.cwd(), 'seed', 'pages', 'about.html'), 'utf8')).trim();
  await sql.begin(async (tx) => {
    const about = await tx`UPDATE pages SET content = ${html}, updated_at = now()
                           WHERE slug = 'about' AND content <> ${html}
                             AND EXISTS (SELECT 1 FROM unnest(${OLD_ABOUT_MARKS}::text[]) AS m WHERE position(m in content) > 0)`;
    if (about.count) log.push('страница «О компании»: новый текст');
    await tx`INSERT INTO settings (key, value) VALUES (${FLAG}, '1') ON CONFLICT (key) DO NOTHING`;
  });
  const home = await getHome();
  if (home.about.text.startsWith(OLD_HOME_ABOUT_START)) {
    home.about.text = DEFAULT_HOME.about.text;
    await saveHome(home);
    log.push('блок «О компании» на главной: новый текст');
  }
  return log;
}

async function upgradeContactShops(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${CONTACT_FLAG}`;
  if (done) return [];
  const log: string[] = [];
  const html = (await readFile(path.resolve(process.cwd(), 'seed', 'pages', 'contact.html'), 'utf8')).trim();
  await sql.begin(async (tx) => {
    for (const p of await tx<{ id: number; content: string }[]>`SELECT id, content FROM pages WHERE slug = 'contact'`) {
      if (norm(p.content) !== norm(OLD_CONTACT_PAGE)) continue;
      await tx`UPDATE pages SET content = ${html}, updated_at = now() WHERE id = ${p.id}`;
      log.push('страница «Контакты»: добавлены салон «Дом Паркета» и магазин на рынке «ЭлитСтрой»');
    }
    await tx`INSERT INTO settings (key, value) VALUES (${CONTACT_FLAG}, '1') ON CONFLICT (key) DO NOTHING`;
  });
  return log;
}

/**
 * Текст от 11.11.2026 вместо текста от 06.11.2026 (seed/pages/archive/about-2026-11-06.html), если его не меняли
 * в админке. Ставит SEO-заголовок и описание страницы, если они пустые или прежние.
 */
async function upgradeAboutCountries(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG_COUNTRIES}`;
  if (done) return [];
  const log: string[] = [];
  const dir = path.resolve(process.cwd(), 'seed', 'pages');
  const html = (await readFile(path.join(dir, 'about.html'), 'utf8')).trim();
  const prev = norm(await readFile(path.join(dir, 'archive', 'about-2026-11-06.html'), 'utf8'));
  await sql.begin(async (tx) => {
    for (const p of await tx<{ id: number; content: string }[]>`SELECT id, content FROM pages WHERE slug = 'about'`) {
      if (norm(p.content) !== prev) continue;
      await tx`UPDATE pages SET content = ${html}, updated_at = now() WHERE id = ${p.id}`;
      log.push('страница «О компании»: заводы Бельгии, Нидерландов и Германии с фото');
    }
    const seo = await tx`UPDATE pages SET seo_title = ${ABOUT_SEO_TITLE},
                           seo_description = CASE WHEN coalesce(trim(seo_description), '') IN ('', ${OLD_ABOUT_SEO_DESC})
                                                  THEN ${ABOUT_SEO_DESC} ELSE seo_description END,
                           updated_at = now()
                         WHERE slug = 'about' AND coalesce(trim(seo_title), '') = ''`;
    if (seo.count) log.push('страница «О компании»: заголовок и описание для Google');
    await tx`INSERT INTO settings (key, value) VALUES (${FLAG_COUNTRIES}, '1') ON CONFLICT (key) DO NOTHING`;
  });
  return log;
}

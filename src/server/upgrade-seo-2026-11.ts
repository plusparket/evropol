// Улучшения для поиска Google по проверке сайта 10.11.2026 (решение владельца: «делай», без цен).
// Один раз при запуске (отметка seo_2026_11_10) меняет только то, что владелец не правил в админке:
//   - почта info@bino.kg → info@evropol.kg в настройках, текстах страниц и разделов;
//   - заголовок главной (title) короче: Google показывает около 60 знаков;
//   - на главной включается блок «О магазине» (1000+ знаков, разделы со ссылками): раньше на главной было ~100 слов;
//   - три новости со старого europroject.kg без текста (2021 год, одна про скрытую террасную доску) скрываются.
import { sql } from './db.ts';
import { DEFAULT_HOME, getHome, saveHome } from './home.ts';

const FLAG = 'seo_2026_11_10';

const OLD_EMAIL = 'info@bino.kg';
export const NEW_EMAIL = 'info@evropol.kg';

export const OLD_HOME_TITLE = 'ЕвроПол: линолеум, ковролин, ковровая плитка, кварцвинил, ламинат, паркет и строительная химия в Бишкеке';
export const HOME_TITLE = 'Напольные покрытия в Бишкеке: магазин ЕвроПол';

/** Текст блока «О магазине» на главной: написан по скиллу stop-slop, без брендов */
export const HOME_ABOUT = {
  title: 'О магазине',
  text: [
    '<p>ЕвроПол продаёт напольные покрытия в Бишкеке с 2000 года. Мы везём товар напрямую с заводов в Европе и ' +
      'подбираем покрытие под объект: квартиру, офис, магазин, гостиницу или школу. На сайте семь разделов:</p>',
    '<ul>',
    '<li><a href="/linoleum">Линолеум</a> бытовой и полукоммерческий из Бельгии и России. Толщина от 1,8 до 4,1 мм, ширина рулона до 4 м.</li>',
    '<li><a href="/carpet">Ковролин</a> в рулонах шириной от 2 до 5 м для спален, гостиных, гостиниц и офисов.</li>',
    '<li><a href="/carpet-tiles">Ковровая плитка</a> квадратами 50 × 50 см и полосами 25 × 100 см для офисов, гостиниц и школ.</li>',
    '<li><a href="/vinyl">Кварцвинил SPC и LVT</a>: доска, ёлочка и плитка. Вода ему не вредит, поэтому его кладут на кухне и в прихожей.</li>',
    '<li><a href="/laminate">Ламинат</a> из Германии толщиной 7, 8 и 12 мм с классами износостойкости от AC3 до AC6.</li>',
    '<li><a href="/parquet">Паркет</a>: паркетная доска и паркет из натурального дерева.</li>',
    '<li><a href="/adhesives">Строительная химия</a>: клеи, грунтовки, наливные полы и лаки для укладки этих покрытий.</li>',
    '</ul>',
    '<p>В карточке модели вы увидите фото, толщину, класс нагрузки и размер. Фильтры каталога отберут модели по цвету, ' +
      'рисунку и формату. В пункте «Укладка и уход» каждого каталога мы рассказали, как подготовить основание, уложить ' +
      'покрытие и ухаживать за ним.</p>',
    '<p>Образцы лежат в магазине по адресу {{address}}, мы работаем {{work_hours}}. Принесите размеры комнаты, и мы ' +
      'посчитаем метраж с запасом на подрезку. Звоните или пишите в WhatsApp: {{phone_main}}.</p>',
  ].join(''),
};

/** Новости со старого сайта без текста: скрываются, если их текст так и остался пустым */
const OLD_NEWS = ['website-launch', 'new-carpet-collection', 'decking-for-summer-terraces'];

export async function upgradeSeo2026(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return [];
  const log: string[] = [];
  await sql.begin(async (tx) => {
    const emails =
      (await tx`UPDATE settings SET value = replace(value, ${OLD_EMAIL}, ${NEW_EMAIL}) WHERE position(${OLD_EMAIL} in value) > 0`).count +
      (await tx`UPDATE pages SET content = replace(content, ${OLD_EMAIL}, ${NEW_EMAIL}), updated_at = now()
                WHERE position(${OLD_EMAIL} in content) > 0`).count +
      (await tx`UPDATE sections SET description = replace(description, ${OLD_EMAIL}, ${NEW_EMAIL}), updated_at = now()
                WHERE position(${OLD_EMAIL} in description) > 0`).count;
    if (emails) log.push(`почта ${NEW_EMAIL} (${emails} записей)`);

    const title = await tx`UPDATE settings SET value = ${HOME_TITLE} WHERE key = 'seo_title' AND value = ${OLD_HOME_TITLE}`;
    if (title.count) log.push(`заголовок главной «${HOME_TITLE}»`);

    const news = await tx`UPDATE news SET is_published = false, updated_at = now()
                          WHERE slug = ANY(${OLD_NEWS}) AND is_published AND coalesce(trim(content), '') = ''`;
    if (news.count) log.push(`скрыто старых новостей без текста: ${news.count}`);
  });

  // Блок «О магазине»: только если владелец его не включал и не менял текст
  const home = await getHome();
  if (!home.about.title && home.about.text === DEFAULT_HOME.about.text) {
    home.about.title = HOME_ABOUT.title;
    home.about.text = HOME_ABOUT.text;
    await saveHome(home);
    log.push('на главной блок «О магазине»');
  }
  await sql`INSERT INTO settings (key, value) VALUES (${FLAG}, ${new Date().toISOString()}) ON CONFLICT (key) DO NOTHING`;
  return log;
}

// --- 11.11.2026: описания для Google не длиннее 160 знаков ------------------------------------------
// Google показывает в выдаче около 160 знаков. У главной было 182, у «О компании» и «Контактов» по 200 (начало текста
// страницы). Меняется только то, что владелец не правил в админке: описание главной по умолчанию и пустые описания страниц.
const FLAG_DESC = 'seo_descriptions_2026_11_11';
const OLD_HOME_DESC =
  'ЕвроПол: линолеум, ковролин, ковровая плитка, кварцвинил SPC и LVT, ламинат, паркет и строительная химия в Бишкеке. ' +
  'Образцы в магазине на ул. Матросова 6/1, тел. +996 (779) 37 72 73.';
export const HOME_DESC =
  'Линолеум, ковролин, ковровая плитка, кварцвинил, ламинат, паркет и строительная химия в Бишкеке. ' +
  'Магазин на ул. Матросова 6/1, тел. +996 (779) 37 72 73.';
const PAGE_DESC: Record<string, string> = {
  about:
    'ЕвроПол продаёт напольные покрытия в Бишкеке с 2000 года и везёт товар с заводов Европы. ' +
    'Магазины на ул. Матросова 6/1, Шабдан Баатыра 354 и в ЭлитСтрое.',
  contact:
    'Магазин «ЕвроПол»: г. Бишкек, ул. Матросова 6/1, тел. +996 (779) 37 72 73, Пн–Сб с 9.00 до 17.00. ' +
    'Второй адрес, карта и WhatsApp на странице.',
};

export async function upgradeDescriptions2026(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG_DESC}`;
  if (done) return [];
  const log: string[] = [];
  await sql.begin(async (tx) => {
    const home = await tx`UPDATE settings SET value = ${HOME_DESC} WHERE key = 'seo_description' AND value = ${OLD_HOME_DESC}`;
    if (home.count) log.push('описание главной для Google короче 160 знаков');
    for (const [slug, text] of Object.entries(PAGE_DESC)) {
      const res = await tx`UPDATE pages SET seo_description = ${text}, updated_at = now()
                           WHERE slug = ${slug} AND coalesce(trim(seo_description), '') = ''`;
      if (res.count) log.push(`описание страницы «${slug}» для Google`);
    }
    await tx`INSERT INTO settings (key, value) VALUES (${FLAG_DESC}, ${new Date().toISOString()}) ON CONFLICT (key) DO NOTHING`;
  });
  return log;
}

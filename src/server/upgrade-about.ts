// Новая страница «О компании» по тексту владельца от 06.11.2026: история с 2000 года, прямые поставки, обучение
// на заводах, работа с архитекторами и крупными объектами, три магазина. Названий брендов на странице нет.
// Один раз при запуске ставит текст из seed/pages/about.html вместо прежней страницы (со списком производителей)
// и прежний текст блока «О компании» главной. Тексты, переписанные в админке, не трогает.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db.ts';
import { DEFAULT_HOME, getHome, saveHome } from './home.ts';

const FLAG = 'about_2026_11_06';
/** Признаки прежних версий страницы: первая фраза и блок «Производители» */
const OLD_ABOUT_MARKS = ['напольные покрытия европейских производителей', '<h2>Производители</h2>'];
/** Прежний текст блока «О компании» на главной (с названием до 05.11.2026 и после) */
const OLD_HOME_ABOUT_START = '<p>Мы поставляем в Кыргызстан напольные покрытия IVC Commercial, Moduleo, BerryAlloc, Modulyss, Betap и BLOQ.';

/** Возвращает список изменений для журнала запуска. */
export async function upgradeAbout(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return [];
  const log: string[] = [];
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

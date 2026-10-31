// Поиск Google (решения владельца 31.10.2026). Один раз при запуске уже заполненной базы:
// - координаты магазина на ул. Матросова 6/1 для разметки schema.org (те же, что на domparketa.kg), если поле пустое;
// - часы работы «Пн–Сб 9:00–17:00» на сайте и Mo-Sa 09:00-17:00 для Google, если поля пустые;
// - название «ЕвроПол» вместо «Европроект» в заголовках и разметке (site_name, заголовок и описание главной),
//   если их не меняли в админке. «Европроект» остаётся вторым названием в разметке (alternateName),
//   в тексте «О компании» и в подписи подвала.
import { sql } from './db.ts';
import { SETTINGS_SCHEMA } from './settings.ts';

const FLAG = 'seo_2026_10_31b';
const OLD_NAME = 'Европроект';
const NEW_NAME = 'ЕвроПол';

const def = (key: string) => SETTINGS_SCHEMA.find((s) => s.key === key)?.default ?? '';

/** Возвращает список изменений для журнала запуска (пустой — ничего не менялось). */
export async function upgradeSeo(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return [];
  const log: string[] = [];
  await sql.begin(async (tx) => {
    const rows = await tx<{ key: string; value: string }[]>`SELECT key, value FROM settings`;
    const stored = new Map(rows.map((r) => [r.key, r.value]));
    const set = async (key: string, value: string, note: string) => {
      await tx`INSERT INTO settings (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      log.push(note);
    };
    const address = stored.get('address') ?? def('address');
    if (!stored.get('geo') && address.includes('Матросова 6/1')) await set('geo', def('geo'), `координаты офиса: ${def('geo')}`);
    if (stored.get('work_hours') === '') await set('work_hours', def('work_hours'), `часы работы: ${def('work_hours')}`);
    if (stored.get('hours_schema') === '') await set('hours_schema', def('hours_schema'), `часы для Google: ${def('hours_schema')}`);
    if (stored.get('site_name') === OLD_NAME) await set('site_name', NEW_NAME, `название в заголовках: ${NEW_NAME}`);
    // Заголовок и описание главной: прежний текст по умолчанию с «Европроект» в начале → тот же с «ЕвроПол»
    for (const key of ['seo_title', 'seo_description']) {
      const cur = stored.get(key);
      if (cur && cur.startsWith(OLD_NAME) && NEW_NAME + cur.slice(OLD_NAME.length) === def(key)) await set(key, def(key), `${key}: ${NEW_NAME}`);
    }
    await tx`INSERT INTO settings (key, value) VALUES (${FLAG}, '1') ON CONFLICT (key) DO NOTHING`;
  });
  return log;
}

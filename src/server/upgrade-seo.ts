// Поиск Google (31.10.2026): координаты магазина на ул. Матросова 6/1 для разметки schema.org (метка на карте
// рядом с сайтом в выдаче). Один раз при запуске: ставит координаты, если поле пустое, а адрес офиса — Матросова 6/1.
// Координаты те же, что у магазина на Матросова 6/1 на сайте domparketa.kg.
import { sql } from './db.ts';

const FLAG = 'seo_2026_10_31';
export const MATROSOVA_GEO = '42.8597994, 74.6189611';

/** Возвращает список изменений для журнала запуска (пустой — ничего не менялось). */
export async function upgradeSeo(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return [];
  const log: string[] = [];
  await sql.begin(async (tx) => {
    const rows = await tx<{ key: string; value: string }[]>`SELECT key, value FROM settings WHERE key IN ('address', 'geo')`;
    const get = (k: string) => rows.find((r) => r.key === k)?.value;
    const address = get('address') ?? 'г. Бишкек, ул. Матросова 6/1';
    if (!get('geo') && address.includes('Матросова 6/1')) {
      await tx`INSERT INTO settings (key, value) VALUES ('geo', ${MATROSOVA_GEO}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      log.push(`координаты офиса для Google: ${MATROSOVA_GEO}`);
    }
    await tx`INSERT INTO settings (key, value) VALUES (${FLAG}, '1') ON CONFLICT (key) DO NOTHING`;
  });
  return log;
}

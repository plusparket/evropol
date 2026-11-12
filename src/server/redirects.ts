// Переадресации со старых адресов (301). Нужны, чтобы при переезде и смене разделов не терять
// позиции в Google и посетителей со старых ссылок. Управляются в админке: «Переадресации».
import { sql } from './db.ts';

export type Redirect = { id: number; fromPath: string; toPath: string; note: string; hits: number; lastHit: Date | null };

/** /O-Kompanii.html/ → /o-kompanii.html (адреса сравниваются без учёта регистра и слэша в конце). */
export function normalizePath(input: string): string {
  let p = input.trim();
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
    p = decodeURI(p);
  } catch {
    /* оставляем как ввели */
  }
  p = p.split(/[?#]/)[0];
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p.toLowerCase();
}

/** Куда вести старый адрес, или undefined. Счётчик переходов помогает понять, нужна ли ещё переадресация. */
export async function findRedirect(pathname: string): Promise<string | undefined> {
  const [row] = await sql<{ id: number; toPath: string }[]>`
    SELECT id, to_path FROM redirects WHERE from_path = ${normalizePath(pathname)}`;
  if (!row) return legacyJoomlaTarget(pathname);
  sql`UPDATE redirects SET hits = hits + 1, last_hit = now() WHERE id = ${row.id}`.catch(() => {});
  return row.toPath;
}

// Старый сайт evropol.kg (Joomla, до ноября 2026): каталог /katalog-bishkek/…, товары …/product/view/N/M.html,
// страницы вроде /паркетная-доска-в-бишкеке.html. Их около 200 и все они в Google, поэтому не по одному в таблице,
// а по словам в адресе: каждый старый адрес ведёт на каталог того же покрытия. Порядок правил важен:
// «moduleo-виниловая-плитка» лежит внутри старой папки «линолеум-…», поэтому винил проверяется раньше линолеума.
// Таблица в админке главнее: адрес из неё сюда не доходит.
const LEGACY_RULES: [RegExp, string][] = [
  [/moduleo|disano|виниловый-паркет/, '/vinyl'],
  [/линолеум/, '/linoleum'],
  [/modulyss|ковровые-плитки/, '/carpet-tiles'],
  [/ковролин|ковровое-покрытие|ковры|циновки|коврики|трава/, '/carpet'],
  [/ламинат|\/component\/jshopping\/product\/view\/5\//, '/laminate'],
  [/паркет|пробков|celenio|haro/, '/parquet'],
  [/^\/доставка$/, '/contact'],
  [/^\/(katalog-bishkek|component\/jshopping|плинтус|напольные-покрытия|отделочные-материалы|инновации-напольных-покрытий|подложка)/, '/'],
];

/** Куда вести адрес старого сайта на Joomla, или undefined, если адрес не оттуда. */
export function legacyJoomlaTarget(pathname: string): string | undefined {
  const p = normalizePath(pathname);
  if (!/^\/(katalog-bishkek|component\/jshopping)(\/|\.html|$)|^\/[^/]*[а-яё][^/]*(\.html)?$/.test(p)) return undefined;
  return LEGACY_RULES.find(([re]) => re.test(p))?.[1];
}

export const listRedirects = () =>
  sql<Redirect[]>`SELECT id, from_path, to_path, note, hits, last_hit FROM redirects ORDER BY from_path`;

export async function saveRedirect(fromPath: string, toPath: string, note = ''): Promise<void> {
  await sql`
    INSERT INTO redirects (from_path, to_path, note) VALUES (${normalizePath(fromPath)}, ${toPath.trim()}, ${note})
    ON CONFLICT (from_path) DO UPDATE SET to_path = EXCLUDED.to_path, note = EXCLUDED.note`;
}

export async function deleteRedirect(id: number): Promise<void> {
  await sql`DELETE FROM redirects WHERE id = ${id}`;
}

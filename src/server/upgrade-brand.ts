// Название «ЕвроПол» вместо прежнего «Европроект» во всех текстах базы (решение владельца 05.11.2026):
// настройки, главная, разделы, бренды, страницы, новости, товары и сайты разделов, включая тексты, изменённые в админке.
// Запускается при каждом старте и меняет только записи, где старое название ещё есть.
// Адреса со старым доменом (europroject.kg, info@europroject.kg, instagram.com/europroject.kg) не трогаются.
import { sql } from './db.ts';

const NEW = 'ЕвроПол';
/** «Европроект», «Европроекта», «ЕВРОПРОЕКТ», «Europroject», «EUROPROJECT» как слово, не часть адреса */
const OLD_RE = /(?<![\w./@-])(?:[ЕеEe]вро[- ]?[Пп]роект|ЕВРО[- ]?ПРОЕКТ|Euro[- ]?[Pp]roject|EURO[- ]?PROJECT)(а|у|ом|е|ы|ов)?(?![\w.-]*\.(?:kg|com|ru)\b)(?![A-Za-z0-9_А-Яа-яЁё])/g;
const PG_FIND = '([ЕеEe]вро[- ]?[Пп]роект|ЕВРО[- ]?ПРОЕКТ|[Ee]uro[- ]?[Pp]roject|EURO[- ]?PROJECT)';

export function renameBrand(text: string): string {
  return text.replace(OLD_RE, (_m, ending: string | undefined) => NEW + (ending ?? ''));
}

/** Возвращает число изменённых записей. */
export async function upgradeBrand(): Promise<number> {
  const cols = await sql<{ tbl: string; col: string; kind: string }[]>`
    SELECT c.table_name AS tbl, c.column_name AS col, c.data_type AS kind
      FROM information_schema.columns c
      JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
       AND c.data_type IN ('text', 'character varying', 'jsonb', 'json')`;
  let changed = 0;
  // Псевдонимы без подчёркиваний: db.ts переводит имена колонок в camelCase
  for (const { tbl: table, col: column, kind: type } of cols) {
    const t = `"${table.replace(/"/g, '""')}"`;
    const c = `"${column.replace(/"/g, '""')}"`;
    const rows = await sql.unsafe<{ id: string; value: string }[]>(
      `SELECT ctid::text AS id, ${c}::text AS value FROM ${t} WHERE ${c}::text ~ $1`,
      [PG_FIND],
    );
    for (const row of rows) {
      const next = renameBrand(row.value);
      if (next === row.value) continue;
      const cast = type === 'jsonb' || type === 'json' ? `::${type}` : '';
      await sql.unsafe(`UPDATE ${t} SET ${c} = $1${cast} WHERE ctid = $2::tid`, [next, row.id]);
      changed++;
    }
  }
  return changed;
}

// Ковролин: характеристики из открытых технических паспортов производителей (владелец 11.11.2026: «если была такая
// информация у официальных сайтов, то добавь»). Данные лежат в seed/catalog/carpet-specs.json по адресу товара:
//   set    — строки таблицы характеристик: такая строка есть — меняется значение, нет — встаёт перед «Страна производства»;
//   text   — абзац в конец описания (добавляется один раз);
//   facets — значения фильтров (исправление типа ворса по описанию коллекции).
// Источники: паспорта моделей на betap.com, паспорта коллекций на carusflooring.com, описания линий
// itc-carpets.com/public/Collection-Sheet-*.pdf. Паспорта отдельных моделей ITC закрыты паролем, их данных здесь нет.
// Названий брендов в данных нет. Один раз при запуске (отметка carpet_specs_2026_11_11).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db.ts';
import { productSlug } from './upgrade-no-brands.ts';

const FLAG = 'carpet_specs_2026_11_11';
type Attr = { label: string; value: string };
type Entry = { set: Attr[]; text: string; facets?: Attr[] };

function merge(list: Attr[], add: Attr[], before?: string): Attr[] {
  const out = [...list];
  for (const a of add) {
    const i = out.findIndex((x) => x.label === a.label);
    if (i >= 0) out[i] = { ...out[i], value: a.value };
    else {
      const at = before ? out.findIndex((x) => x.label === before) : -1;
      out.splice(at >= 0 ? at : out.length, 0, a);
    }
  }
  return out;
}

export async function upgradeCarpetSpecs(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return [];
  const raw = await readFile(path.resolve(process.cwd(), 'seed', 'catalog', 'carpet-specs.json'), 'utf8').catch(() => '');
  if (!raw) return [];
  const data = JSON.parse(raw) as Record<string, Entry>;
  // Адреса в файле как в seed/catalog/carpet.json; после чистки брендов адрес без имени бренда (itc-kanso-64 → kanso-64)
  for (const [slug, e] of Object.entries(data)) data[productSlug(slug)] ??= e;
  let changed = 0;
  await sql.begin(async (tx) => {
    const rows = await tx<{ id: number; slug: string; specs: Attr[]; facets: Attr[]; description: string }[]>`
      SELECT p.id, p.slug, p.specs, p.facets, p.description FROM products p JOIN sections s ON s.id = p.section_id
      WHERE s.slug = 'carpet'`;
    for (const r of rows) {
      const e = data[r.slug];
      if (!e) continue;
      const specs = merge(r.specs, e.set, 'Страна производства');
      const facets = e.facets ? merge(r.facets, e.facets) : r.facets;
      const description = r.description.includes(e.text) ? r.description : `${r.description.trimEnd()}\n${e.text}`;
      await tx`UPDATE products SET specs = ${tx.json(specs)}, facets = ${tx.json(facets)}, description = ${description},
        updated_at = now() WHERE id = ${r.id}`;
      changed++;
    }
    await tx`INSERT INTO settings (key, value) VALUES (${FLAG}, '1') ON CONFLICT (key) DO NOTHING`;
  });
  return changed ? [`ковролин: характеристики производителей у ${changed} моделей`] : [];
}

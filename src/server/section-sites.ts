// Сайты разделов: первичная настройка и фото товаров.
//
// setupSectionSites() — один раз при запуске: включает сайт раздела «SPC / LVT / кварцвинил» по адресу
// vinyl.<адрес главного сайта> (на компьютере — vinyl.localhost) и загружает товары из seed/catalog/<раздел>.json
// в разделы, где товаров ещё нет. Адрес и цвет потом меняются в админке: «Разделы» → раздел → «Сайт раздела».
//
// importProductPhotos() — при каждом запуске, в фоне: скачивает фото производителя для товаров, у которых фото
// ещё нет. Нет интернета — попробует при следующем запуске. Фото, загруженные в админке, не трогает.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db.ts';
import { normalizeHost } from './sections.ts';
import { removeUploads, saveImage } from './uploads.ts';
import type { Attr } from './products.ts';

const FLAG = 'section_sites';
const CATALOG_DIR = path.resolve(process.cwd(), 'seed/catalog');
/** Разделы, у которых сайт включается сразу (остальные — из админки) */
const FIRST_SITES = ['vinyl'];

type SeedProduct = {
  brand: string; name: string; slug: string; collection: string; sku: string; attributes: Attr[]; facets: Attr[];
  specs: Attr[]; description: string; images: string[]; sourceUrl: string;
};

/** Адрес сайта раздела по адресу главного сайта: localhost → vinyl.localhost, europroject.kg → vinyl.europroject.kg */
export function defaultSiteHost(slug: string): string {
  const main = normalizeHost(process.env.SITE_URL || 'localhost').replace(/^www\./, '');
  return `${slug}.${main}`;
}

/** Возвращает список изменений для журнала запуска. */
export async function setupSectionSites(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return [];
  const log: string[] = [];

  for (const slug of FIRST_SITES) {
    const host = defaultSiteHost(slug);
    const rows = await sql<{ name: string }[]>`
      UPDATE sections SET site_host = ${host}, updated_at = now()
      WHERE slug = ${slug} AND site_host = '' AND NOT EXISTS (SELECT 1 FROM sections WHERE lower(site_host) = ${host})
      RETURNING name`;
    for (const r of rows) log.push(`«${r.name}»: сайт раздела http://${host}`);
  }

  const files = (await readdir(CATALOG_DIR).catch(() => [] as string[])).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    const seed = JSON.parse(await readFile(path.join(CATALOG_DIR, file), 'utf8')) as { section: string; products: SeedProduct[] };
    const [section] = await sql<{ id: number; name: string }[]>`SELECT id, name FROM sections WHERE slug = ${seed.section}`;
    if (!section) continue;
    const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM products WHERE section_id = ${section.id}`;
    if (n) continue;
    const brands = new Map(
      (await sql<{ id: number; name: string }[]>`SELECT id, name FROM brands WHERE section_id = ${section.id}`).map((b) => [b.name, b.id]),
    );
    await sql.begin(async (tx) => {
      for (const [i, p] of seed.products.entries()) {
        await tx`INSERT INTO products ${tx({
          sectionId: section.id,
          brandId: brands.get(p.brand) ?? null,
          slug: p.slug,
          name: p.name,
          collection: p.collection,
          sku: p.sku,
          attributes: tx.json(p.attributes),
          facets: tx.json(p.facets),
          specs: tx.json(p.specs),
          description: p.description,
          sourceImages: tx.json(p.images),
          sourceUrl: p.sourceUrl,
          sortOrder: (i + 1) * 10,
        })}`;
      }
    });
    log.push(`«${section.name}»: товаров ${seed.products.length}`);
  }

  await sql`INSERT INTO settings (key, value) VALUES (${FLAG}, ${new Date().toISOString()}) ON CONFLICT (key) DO NOTHING`;
  return log;
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

let running = false;

/** Скачивает фото производителя для товаров без фото. Возвращает число товаров, получивших фото. */
export async function importProductPhotos(log: (msg: string) => void = console.log): Promise<number> {
  if (running) return 0;
  running = true;
  try {
    const todo = await sql<{ id: number; name: string; sourceImages: string[] }[]>`
      SELECT id, name, source_images FROM products WHERE images = '[]' AND source_images <> '[]' ORDER BY section_id, sort_order, id`;
    if (!todo.length) return 0;
    log(`фото товаров: скачиваю для ${todo.length} товаров`);
    let done = 0;
    for (const p of todo) {
      const saved: string[] = [];
      for (const url of p.sourceImages) {
        const buf = await download(url);
        if (!buf) continue;
        const [rel] = await saveImage(buf, 'product').catch(() => [null]);
        if (rel) saved.push(rel);
      }
      if (!saved.length) {
        // Первый товар без единого фото — скорее всего, нет интернета: остальные не мучаем, повтор при следующем запуске
        if (!done) {
          log('фото товаров: сайт производителя недоступен, попробую при следующем запуске');
          return 0;
        }
        continue;
      }
      // Пока фото качались, их могли загрузить в админке — тогда скачанные не нужны
      const updated = await sql`UPDATE products SET images = ${sql.json(saved)} WHERE id = ${p.id} AND images = '[]'`;
      if (updated.count) done++;
      else await removeUploads(...saved);
    }
    log(`фото товаров: готово для ${done} из ${todo.length}`);
    return done;
  } finally {
    running = false;
  }
}

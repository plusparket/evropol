// Сайты разделов: первичная настройка и фото товаров.
//
// setupSectionSites() — при запуске, один раз для каждого раздела из SITES: включает сайт раздела по адресу
// <раздел>.<адрес главного сайта> (на компьютере — vinyl.localhost, laminate.localhost), добавляет разделу бренды
// и товары из seed/catalog/<раздел>.json, если товаров в разделе ещё нет. Отметка в настройках: section_site:<раздел>.
// Адрес и цвет потом меняются в админке: «Разделы» → раздел → «Сайт раздела».
//
// importProductPhotos() — при каждом запуске, в фоне: скачивает фото производителя для товаров, у которых фото
// ещё нет. Нет интернета — попробует при следующем запуске. Фото, загруженные в админке, не трогает.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db.ts';
import { normalizeHost } from './sections.ts';
import { removeUploads, saveImage } from './uploads.ts';
import type { Attr } from './products.ts';

const CATALOG_DIR = path.resolve(process.cwd(), 'seed/catalog');
/** Разделы, у которых сайт включается сам (по решению владельца); остальные — из админки */
const SITES = ['vinyl', 'laminate'];
/** Отметка первой версии, когда настраивался только vinyl */
const OLD_FLAG = 'section_sites';

type SeedProduct = {
  brand: string; name: string; slug: string; collection: string; sku: string; attributes: Attr[]; facets: Attr[];
  specs: Attr[]; description: string; images: string[]; sourceUrl: string;
};
type SeedBrand = { name: string; link?: string; description?: string };
type SeedCatalog = { section: string; brands?: SeedBrand[]; products: SeedProduct[] };

/** Адрес сайта раздела по адресу главного сайта: localhost → vinyl.localhost, europroject.kg → vinyl.europroject.kg */
export function defaultSiteHost(slug: string): string {
  const main = normalizeHost(process.env.SITE_URL || 'localhost').replace(/^www\./, '');
  return `${slug}.${main}`;
}

/** Возвращает список изменений для журнала запуска. */
export async function setupSectionSites(): Promise<string[]> {
  const log: string[] = [];
  const done = new Set((await sql<{ key: string }[]>`SELECT key FROM settings WHERE key LIKE 'section_site%'`).map((r) => r.key));
  if (done.has(OLD_FLAG)) done.add('section_site:vinyl');

  for (const slug of SITES) {
    const flag = `section_site:${slug}`;
    if (done.has(flag)) continue;
    const [section] = await sql<{ id: number; name: string }[]>`SELECT id, name FROM sections WHERE slug = ${slug}`;
    if (section) {
      const host = defaultSiteHost(slug);
      const on = await sql`
        UPDATE sections SET site_host = ${host}, updated_at = now()
        WHERE id = ${section.id} AND site_host = '' AND NOT EXISTS (SELECT 1 FROM sections WHERE lower(site_host) = ${host})`;
      if (on.count) log.push(`«${section.name}»: сайт раздела http://${host}`);
      const added = await loadCatalog(section.id, slug);
      if (added) log.push(`«${section.name}»: товаров ${added}`);
    }
    await sql`INSERT INTO settings (key, value) VALUES (${flag}, ${new Date().toISOString()}) ON CONFLICT (key) DO NOTHING`;
  }
  return log;
}

/** Бренды и товары из seed/catalog/<раздел>.json — только в раздел без товаров. Возвращает число товаров. */
async function loadCatalog(sectionId: number, slug: string): Promise<number> {
  const raw = await readFile(path.join(CATALOG_DIR, `${slug}.json`), 'utf8').catch(() => '');
  if (!raw) return 0;
  const seed = JSON.parse(raw) as SeedCatalog;
  const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM products WHERE section_id = ${sectionId}`;
  if (n) return 0;

  return sql.begin(async (tx) => {
    // Бренд, которого в разделе нет, добавляем; логотип берём у такого же бренда из другого раздела
    for (const b of seed.brands ?? []) {
      const [have] = await tx`SELECT 1 FROM brands WHERE section_id = ${sectionId} AND name = ${b.name}`;
      if (have) continue;
      const [same] = await tx<{ logo: string }[]>`SELECT logo FROM brands WHERE name = ${b.name} AND logo <> '' LIMIT 1`;
      const [{ max }] = await tx<{ max: number }[]>`SELECT coalesce(max(sort_order), 0)::int AS max FROM brands WHERE section_id = ${sectionId}`;
      await tx`INSERT INTO brands ${tx({
        sectionId, name: b.name, logo: same?.logo ?? '', link: b.link ?? '', description: b.description ?? '', sortOrder: max + 10,
      })}`;
    }
    const brands = new Map(
      (await tx<{ id: number; name: string }[]>`SELECT id, name FROM brands WHERE section_id = ${sectionId}`).map((b) => [b.name, b.id]),
    );
    for (const [i, p] of seed.products.entries()) {
      await tx`INSERT INTO products ${tx({
        sectionId,
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
    return seed.products.length;
  });
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

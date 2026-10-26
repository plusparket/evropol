// Сайты разделов: первичная настройка и фото товаров.
//
// setupSectionSites() — при запуске, один раз для каждого раздела из SITES: включает сайт раздела по адресу
// <раздел>.<адрес главного сайта> (на компьютере — vinyl.localhost, laminate.localhost), добавляет разделу бренды
// и товары из seed/catalog/<раздел>.json, если товаров в разделе ещё нет. Отметка в настройках: section_site:<раздел>.
// При каждом запуске: если в файле выросло поле version, добавляет новые товары, обновляет метку «В наличии»
// и ссылки на фото у товаров, у которых фото ещё нет (upgradeCatalog, отметка catalog_version:<раздел>).
// Адрес и цвет потом меняются в админке: «Разделы» → раздел → «Сайт раздела».
//
// importProductPhotos() — при каждом запуске, в фоне: скачивает фото производителя для товаров, у которых фото
// ещё нет. Нет интернета — попробует при следующем запуске. Фото, загруженные в админке, не трогает.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db.ts';
import type { TransactionSql } from 'postgres';
import { normalizeHost } from './sections.ts';
import { removeUploads, saveImage } from './uploads.ts';
import type { Attr } from './products.ts';

const CATALOG_DIR = path.resolve(process.cwd(), 'seed/catalog');
/** Разделы, у которых сайт включается сам (по решению владельца); остальные — из админки */
const SITES = ['vinyl', 'laminate', 'linoleum', 'adhesives'];
/** Отметка первой версии, когда настраивался только vinyl */
const OLD_FLAG = 'section_sites';

type SeedProduct = {
  brand: string; name: string; slug: string; collection: string; sku: string; attributes: Attr[]; facets: Attr[];
  specs: Attr[]; description: string; images: string[]; sourceUrl: string; isNew?: boolean;
  /** Метка «В наличии» */
  inStock?: boolean;
  /** Адреса категорий товара (из categories файла) */
  categories?: string[];
};
type SeedBrand = { name: string; link?: string; description?: string };
/** Тексты и вид сайта раздела, которые ставятся вместе с каталогом (пустые поля не трогаются) */
type SeedSite = { layout?: string; address?: string; heading?: string; summary?: string; description?: string; seoTitle?: string; seoDescription?: string };
/**
 * hideBrands — убрать бренды раздела с сайта (товары без бренда, производитель указан в характеристиках).
 * version — номер версии каталога: когда он растёт, при запуске добавляются новые товары и обновляется «В наличии»
 * (см. upgradeCatalog). categories — группы и категории товаров (вид главной 'groups').
 */
type SeedCatalog = {
  section: string; version?: number; site?: SeedSite; hideBrands?: boolean; brands?: SeedBrand[]; categories?: SeedCategory[]; products: SeedProduct[];
};

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
    if (done.has(flag)) {
      const [section] = await sql<{ id: number; name: string }[]>`SELECT id, name FROM sections WHERE slug = ${slug}`;
      const up = section ? await upgradeCatalog(section.id, slug) : null;
      if (up?.added) log.push(`«${section!.name}»: новых товаров ${up.added}`);
      if (up?.inStock) log.push(`«${section!.name}»: метка «В наличии» обновлена у ${up.inStock}`);
      continue;
    }
    const [section] = await sql<{ id: number; name: string }[]>`SELECT id, name FROM sections WHERE slug = ${slug}`;
    if (section) {
      const host = defaultSiteHost(slug);
      const on = await sql`
        UPDATE sections SET site_host = ${host}, updated_at = now()
        WHERE id = ${section.id} AND site_host = '' AND NOT EXISTS (SELECT 1 FROM sections WHERE lower(site_host) = ${host})`;
      if (on.count) log.push(`«${section.name}»: сайт раздела http://${host}`);
      const added = await loadCatalog(section.id, slug);
      if (added) log.push(`«${section.name}»: товаров ${added}`);
      // Если товары в разделе уже были, загрузка пропущена: недостающие добавит новая версия каталога
      const up = await upgradeCatalog(section.id, slug);
      if (up?.added) log.push(`«${section.name}»: новых товаров ${up.added}`);
    }
    await sql`INSERT INTO settings (key, value) VALUES (${flag}, ${new Date().toISOString()}) ON CONFLICT (key) DO NOTHING`;
  }
  return log;
}

type SeedCategory = { slug: string; name: string; description?: string; children?: SeedCategory[] };

async function readSeed(slug: string): Promise<SeedCatalog | null> {
  const raw = await readFile(path.join(CATALOG_DIR, `${slug}.json`), 'utf8').catch(() => '');
  return raw ? (JSON.parse(raw) as SeedCatalog) : null;
}

/** Бренды и товары из seed/catalog/<раздел>.json — только в раздел без товаров. Возвращает число товаров. */
async function loadCatalog(sectionId: number, slug: string): Promise<number> {
  const seed = await readSeed(slug);
  if (!seed) return 0;
  const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM products WHERE section_id = ${sectionId}`;
  if (n) return 0;

  return sql.begin(async (tx) => {
    const site = seed.site ?? {};
    const texts = Object.fromEntries(
      Object.entries({ siteLayout: site.layout, siteAddress: site.address, heading: site.heading, summary: site.summary, description: site.description,
        seoTitle: site.seoTitle, seoDescription: site.seoDescription }).filter(([, v]) => v),
    );
    if (Object.keys(texts).length) await tx`UPDATE sections SET ${tx(texts)}, updated_at = now() WHERE id = ${sectionId}`;
    if (seed.hideBrands) await tx`UPDATE brands SET is_active = false WHERE section_id = ${sectionId}`;
    return addSeedProducts(tx, sectionId, seed);
  });
}

/**
 * Новая версия каталога в seed/catalog/<раздел>.json (поле version больше записанного в настройках
 * catalog_version:<раздел>): добавляет товары, которых в разделе ещё нет (по адресу), и ставит метку «В наличии»
 * товарам из файла так, как в файле. Остальные товары и правки в админке не трогает. Возвращает число новых товаров.
 */
async function upgradeCatalog(sectionId: number, slug: string): Promise<{ added: number; inStock: number } | null> {
  const seed = await readSeed(slug);
  if (!seed?.version) return null;
  const key = `catalog_version:${slug}`;
  const [row] = await sql<{ value: string }[]>`SELECT value FROM settings WHERE key = ${key}`;
  if (Number(row?.value ?? 0) >= seed.version) return null;
  return sql.begin(async (tx) => {
    const added = await addSeedProducts(tx, sectionId, seed);
    let inStock = 0;
    for (const p of seed.products) {
      const r = await tx`UPDATE products SET in_stock = ${p.inStock ?? false}, updated_at = now()
        WHERE section_id = ${sectionId} AND slug = ${p.slug} AND in_stock <> ${p.inStock ?? false}`;
      inStock += r.count;
      // Товар без фото: берём ссылки на фото производителя из файла (могли исправить), importProductPhotos скачает их
      await tx`UPDATE products SET source_images = ${tx.json(p.images)}, updated_at = now()
        WHERE section_id = ${sectionId} AND slug = ${p.slug} AND images = '[]'::jsonb AND source_images <> ${tx.json(p.images)}`;
    }
    await tx`INSERT INTO settings (key, value) VALUES (${key}, ${String(seed.version)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    return { added, inStock };
  });
}

type Tx = TransactionSql<{}>;

/** Добавляет бренды, категории и товары из файла, которых в разделе ещё нет. Возвращает число новых товаров. */
async function addSeedProducts(tx: Tx, sectionId: number, seed: SeedCatalog): Promise<number> {
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

  // Категории: группы и их категории по порядку файла; существующие (по адресу) не меняются
  const categories = new Map<string, number>(
    (await tx<{ id: number; slug: string }[]>`SELECT id, slug FROM product_categories WHERE section_id = ${sectionId}`).map((c) => [c.slug, c.id]),
  );
  const addCategory = async (c: SeedCategory, parentId: number | null, sortOrder: number) => {
    if (!categories.has(c.slug)) {
      const [{ id }] = await tx<{ id: number }[]>`INSERT INTO product_categories ${tx({
        sectionId, parentId, slug: c.slug, name: c.name, description: c.description ?? '', sortOrder,
      })} RETURNING id`;
      categories.set(c.slug, id);
    }
    for (const [i, child] of (c.children ?? []).entries()) await addCategory(child, categories.get(c.slug)!, (i + 1) * 10);
  };
  for (const [i, c] of (seed.categories ?? []).entries()) await addCategory(c, null, (i + 1) * 10);

  const have = new Set((await tx<{ slug: string }[]>`SELECT slug FROM products WHERE section_id = ${sectionId}`).map((r) => r.slug));
  const [{ max }] = await tx<{ max: number }[]>`SELECT coalesce(max(sort_order), 0)::int AS max FROM products WHERE section_id = ${sectionId}`;
  let added = 0;
  for (const [i, p] of seed.products.entries()) {
    if (have.has(p.slug)) continue;
    const [{ id }] = await tx<{ id: number }[]>`INSERT INTO products ${tx({
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
      isNew: p.isNew ?? false,
      inStock: p.inStock ?? false,
      sortOrder: max + (i + 1) * 10,
    })} RETURNING id`;
    for (const c of p.categories ?? []) {
      const categoryId = categories.get(c);
      if (categoryId) await tx`INSERT INTO product_category_items (category_id, product_id) VALUES (${categoryId}, ${id}) ON CONFLICT DO NOTHING`;
    }
    added++;
  }
  return added;
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

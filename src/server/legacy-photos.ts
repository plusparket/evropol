// Фото со старого сайта europroject.kg: один раз при запуске скачивает фото слайдера главной, картинки брендов
// и обложки новостей и подставляет их туда, где в админке фото ещё нет. Загруженное вручную не трогает.
// Если старый сайт недоступен (нет интернета), пробует при следующем запуске. После удачной попытки
// в настройках ставится отметка legacy_photos_imported, и больше скрипт не запускается.
import sharp from 'sharp';
import { sql } from './db.ts';
import { DEFAULT_HOME, getHome, saveHome } from './home.ts';
import { saveImage } from './uploads.ts';

const OLD_SITE = process.env.LEGACY_SITE_URL || 'https://europroject.kg';
const FLAG = 'legacy_photos_imported';
/** Сколько фото слайдера взять с главной старого сайта */
const HERO_MAX = 8;

// Картинки брендов и новостей на главной старого сайта (по ответу europroject.kg 23.10.2026)
const BRAND_FILES: Record<string, string> = {
  '/images/moduleo.jpg': 'Moduleo',
  '/images/berry.jpg': 'BerryAlloc',
  '/images/mod.jpg': 'Modulyss',
  '/images/betap.jpg': 'Betap',
  '/images/ivc.jpg': 'IVC Commercial',
  '/images/bloq.jpg': 'BLOQ',
};
const NEWS_FILES: Record<string, string> = {
  '/images/news/ws.jpg': 'website-launch',
  '/images/news/kkkk.jpg': 'new-carpet-collection',
  '/images/news/trrr.jpg': 'decking-for-summer-terraces',
};
// Логотип и значки — не фото
const SKIP = /\/(epro|001-instagram|logo)[^/]*\.(png|jpe?g|svg)$/i;

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Все адреса картинок со старого сайта, упомянутые в HTML (img, data-src, фон в стилях, настройки слайдера). */
function imageUrls(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/["'(\s=]((?:https?:\/\/(?:www\.)?europroject\.kg)?\/?(?:images|media)\/[^"'()\s<>]+?\.(?:jpe?g|png|webp))/gi)) {
    const path = new URL(m[1].replace(/\\\//g, '/'), OLD_SITE + '/').pathname;
    found.add(decodeURI(path));
  }
  // По имени файла: sll1, sll2, sll31… — тот же порядок, что в слайдере старого сайта
  return [...found].sort();
}

export async function importLegacyPhotos(log: (msg: string) => void = console.log): Promise<void> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return;

  let html = '';
  try {
    const res = await fetch(OLD_SITE + '/', { signal: AbortSignal.timeout(20_000) });
    if (res.ok) html = await res.text();
  } catch {}
  if (!html) {
    log('фото со старого сайта: europroject.kg недоступен, попробую при следующем запуске');
    return;
  }

  const urls = imageUrls(html);
  const known = new Set([...Object.keys(BRAND_FILES), ...Object.keys(NEWS_FILES)]);

  // Слайдер: крупные горизонтальные фото, которых нет среди картинок брендов и новостей
  const home = await getHome();
  if (!home.hero.images.filter(Boolean).length) {
    const hero: string[] = [];
    for (const path of urls) {
      if (hero.length >= HERO_MAX) break;
      if (known.has(path) || SKIP.test(path)) continue;
      const buf = await download(OLD_SITE + encodeURI(path));
      const meta = buf && (await sharp(buf).metadata().catch(() => null));
      if (!buf || !meta?.width || !meta.height || meta.width < 1000 || meta.width < meta.height) continue;
      hero.push((await saveImage(buf, 'home'))[0]);
    }
    if (hero.length) {
      home.hero.images = hero;
      // На фото старого слайдера уже есть свои подписи — стандартную плашку с заголовком убираем,
      // как на europroject.kg. Заголовок, изменённый в админке, остаётся.
      if (home.hero.title === DEFAULT_HOME.hero.title) Object.assign(home.hero, { title: '', text: '', button: '' });
      await saveHome(home);
    }
    log(`фото со старого сайта: в слайдер главной ${hero.length}`);
  }

  let brands = 0;
  for (const [path, name] of Object.entries(BRAND_FILES)) {
    const rows = await sql<{ id: number }[]>`SELECT id FROM brands WHERE name = ${name} AND logo = ''`;
    if (!rows.length) continue;
    const buf = await download(OLD_SITE + path);
    if (!buf) continue;
    const [rel] = await saveImage(buf, 'brand').catch(() => [null]);
    if (!rel) continue;
    // У одного бренда может быть несколько записей (IVC Commercial в двух разделах) — картинка общая
    await sql`UPDATE brands SET logo = ${rel} WHERE id IN ${sql(rows.map((r) => r.id))}`;
    brands++;
  }

  let news = 0;
  for (const [path, slug] of Object.entries(NEWS_FILES)) {
    const [row] = await sql<{ id: number }[]>`SELECT id FROM news WHERE slug = ${slug} AND image = ''`;
    if (!row) continue;
    const buf = await download(OLD_SITE + path);
    if (!buf) continue;
    const [rel] = await saveImage(buf, 'content').catch(() => [null]);
    if (!rel) continue;
    await sql`UPDATE news SET image = ${rel} WHERE id = ${row.id}`;
    news++;
  }
  log(`фото со старого сайта: брендов ${brands}, новостей ${news}`);

  await sql`INSERT INTO settings (key, value) VALUES (${FLAG}, ${new Date().toISOString()}) ON CONFLICT (key) DO NOTHING`;
}

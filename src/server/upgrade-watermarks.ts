// Фото товаров без водяных знаков (просьба владельца 10.11.2026: «водяные знаки нужно убрать, товары оставь»).
// На 32 фото линолеума, скачанных с сайтов продавцов, были надписи: IVC-RUS.RU по центру, логотип «Линолеум и
// Ковролин» в углу, логотип производителя с надписью «Сайма», www.dostroydom.by, логотип 33kvadrata.
// Очищенные фото лежат в seed/photos/linoleum: угловые знаки обрезаны, надпись по центру снята обратным наложением.
// Два фото со следом знака, который не уходит, убраны: у этих товаров есть другие фото того же рисунка.
// В других разделах водяных знаков нет (проверены все 1376 фото 10.11.2026).
// Один раз при запуске (отметка watermarks_2026_11_10): у товаров, где ссылки на фото те же, что были в файле
// каталога, фото заменяются очищенными из seed/catalog/linoleum.json. Фото, загруженные в админке, не трогаются.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db.ts';
import { removeUploads, saveImage } from './uploads.ts';

const FLAG = 'watermarks_2026_11_10';
const SEED_DIR = path.resolve(process.cwd(), 'seed');

/** Прежние ссылки на фото (с водяными знаками) по адресам товаров раздела «Линолеум» */
const OLD: Record<string, string[]> = {
  'allyur-569': ["https://linoleum.msk.ru/upload/iblock/1c2/1c254909a25cb452cd5acab4a0ea1061.jpg", "https://linoleum.msk.ru/upload/iblock/995/995328e2670d020ec89967b14a4636b4.jpg"],
  'anya-589': ["https://linoleum.msk.ru/upload/iblock/67a/67a665a3377037a6d3a4463c8d5c030a.jpg", "https://www.strousnab.ru/wa-data/public/shop/products/27/04/10427/images/21098/21098.750x0.jpg", "https://linoleum.msk.ru/upload/iblock/dee/dee7f95e471fe77e87235139b37c1718.jpg"],
  'avalon-917': ["https://linoleum.msk.ru/upload/iblock/cad/cad21c4f35debd06a4118d743ef55d01.jpg", "https://linoleum.msk.ru/upload/iblock/89e/89eb92c3ca582f3ed587fc5492d2d705.jpg"],
  'avalon-991': ["https://linoleum.msk.ru/upload/iblock/166/166f6d14be6862cf876bdb75045b130a.jpg", "https://linoleum.msk.ru/upload/iblock/9ee/9ee2e69f4ad403dd41ed27a329cee987.jpg"],
  'berlin-506': ["https://linoleum.msk.ru/upload/iblock/13c/13c206e762411a689c91dbb32f6f039e.jpg", "https://ivc-rus.ru/attachments/4/d/4d7f1627615480640ff2a3256acf79fb_m.jpg", "https://linoleum.msk.ru/upload/iblock/0e5/0e5ba721aac7b5a6d6954fb708a7117d.jpg"],
  'berlin-531': ["https://dostroydom.by/published/publicdata/BYCHKOSERGEI1DOSTROY/attachments/SC/products_pictures/berlin-531_0.jpg", "https://linoleum-kovrolin.ru/5519-large_default/greenline-berlin-531.jpg"],
  'berlin-556': ["https://ivc-rus.ru/attachments/6/f/6f830beed3ed4212b592ac17dc70a9c7_m.jpg"],
  'dub-satin-750': ["https://www.maxidom.ru/upload/iblock/583/58317e3e5a48b58bd298ad06863a7ad3.jpg", "https://ivc-rus.ru/attachments/b/d/bd0a18f97ee6ebbfd5b7cd7550681dba_m.jpg"],
  'dub-sheldon-w42': ["https://ivc-rus.ru/attachments/4/5/45d9aafc92a64a51a0d0c53419f5e40a_m.jpg"],
  'granada-764': ["https://www.magazinsaima.ru/image/cache2/data/linoleum/ivc/atlas/linoleum-ivc-atlas-granada-764-700x700.jpg"],
  'karte-w36': ["https://linoleum.msk.ru/upload/iblock/bb2/bb2091e9cd7d531620989d5fa2114a34.jpg", "https://ivc-rus.ru/attachments/0/1/01afe18f88fed69597b3925768cf55f4_m.jpg", "https://linoleum.msk.ru/upload/iblock/cc7/cc72228ebea27e2f2da9cac8fb014840.jpg"],
  'khelena-569': ["https://linoleum.msk.ru/upload/iblock/6f1/6f1f90bef5a1f5c3aa6cf4113169bee5.jpg", "https://linoleum.msk.ru/upload/iblock/4ce/4cec772c1ba18d07739e09b5cb15c683.jpg"],
  'kyanti-532': ["https://linoleum.msk.ru/upload/iblock/a9b/a9b656ecf805e08d45540f9b4f42c30e.jpg", "https://linoleum.msk.ru/upload/iblock/2ff/2ffe7d8a3bc87e07d21eb8dd18bf0dac.jpg"],
  'maras-t44': ["https://linoleum.msk.ru/upload/iblock/eb3/eb3edf4826c3eb3bc6773ae240bcd248.jpg", "https://ivc-rus.ru/attachments/1/1/111b3a4a8f5c20e75a28d40a5d7600e3_m.jpg", "https://linoleum.msk.ru/upload/iblock/dd3/dd32211da06b596eeebcdb06e4f82e1e.jpg"],
  'morzin-547': ["https://linoleum.msk.ru/upload/iblock/185/1855d856de4de7779af74adda19fef20.jpg", "https://ivc-rus.ru/attachments/b/a/bac36805ad8bd72c8b11a374aa4c47dc_m.jpg", "https://linoleum.msk.ru/upload/iblock/548/54814a14130f0888cc13d2a43127bd1c.jpg"],
  'morzin-832': ["https://linoleum.msk.ru/upload/iblock/1b5/1b5bb6c90b3950b42f8596074b060794.jpg", "https://ivc-rus.ru/attachments/1/e/1e1330d26c5ec7e2d369a9b5639bb683_m.jpg", "https://linoleum.msk.ru/upload/iblock/42e/42ef9c2e7af7cbf2201bd8fec7547aab.jpg"],
  'oslo-538': ["https://linoleum-kovrolin.ru/13945-large_default/greenline-oslo-538.jpg", "https://ivc-rus.ru/attachments/6/6/66aa2928baaab3921526a7367ac1869f_m.jpg"],
  'ostin-796': ["https://ivc-rus.ru/attachments/b/6/b60854df9c273b4241218cdb13501673_m.jpg"],
  'shatel-531': ["https://linoleum.msk.ru/upload/iblock/800/800950a9338b4ed157688aaa693fcb51.jpg", "https://33kvadrata.ru/image/cache/catalog/ivc/ecotex/chatel531-800x800.jpg", "https://linoleum.msk.ru/upload/iblock/e16/e1649e7af2b1436405719f31e2348be4.jpg"],
  'sherbur-w48': ["https://linoleum.msk.ru/upload/iblock/43e/43ec27fe887dd015d79429536a74ac00.jpg", "https://ivc-rus.ru/attachments/1/1/11eea89f200a3e33fb8785b12599d0e6_m.jpg", "https://linoleum-kovrolin.ru/32048-large_default/greenline-cherbourg-oak-w48.jpg"],
  'tavel-42': ["https://ivc-rus.ru/attachments/4/9/490906c9faf9796e5fb979e007ee9c8e_m.jpg"],
  'toronto-506': ["https://linoleum.msk.ru/upload/iblock/e02/e02521234b5738e52eabd8afbfefae90.jpg", "https://ivc-rus.ru/attachments/b/b/bb34a5b5b7f2423f5ea62fa26feda292_m.jpg", "https://linoleum.msk.ru/upload/iblock/294/294514e0b8b1d51c487ec87bda9e2ad7.jpg"],
  'valentina-558': ["https://linoleum.msk.ru/upload/iblock/148/1486377b6a0faf489059e0d55478c13a.jpg", "https://linoleum.msk.ru/upload/iblock/03d/03d59e584a8cebd994188dd7a36388eb.jpg"],
  'yakobsen-w32': ["https://ivc-rus.ru/attachments/4/f/4f311467fb9b72225047d7d43afb4e2a_m.jpg"],
};

export async function upgradeWatermarks(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return [];
  const catalog = JSON.parse(await readFile(path.join(SEED_DIR, 'catalog/linoleum.json'), 'utf8')) as {
    products: { slug: string; images: string[] }[];
  };
  const fresh = new Map(catalog.products.map((p) => [p.slug, p.images]));
  let changed = 0;
  for (const [slug, old] of Object.entries(OLD)) {
    const images = fresh.get(slug);
    if (!images?.length) continue;
    const [p] = await sql<{ id: number; images: string[] }[]>`
      SELECT p.id, p.images FROM products p JOIN sections s ON s.id = p.section_id
      WHERE s.slug = 'linoleum' AND p.slug = ${slug} AND p.source_images = ${sql.json(old)}`;
    if (!p) continue;
    // Фото ещё не скачаны: хватит новых ссылок, importProductPhotos возьмёт их из seed/photos
    if (!p.images.length) {
      await sql`UPDATE products SET source_images = ${sql.json(images)}, updated_at = now() WHERE id = ${p.id}`;
      changed++;
      continue;
    }
    const saved: string[] = [];
    for (const url of images) {
      const buf = await readFile(path.join(SEED_DIR, url.replace(/^seed:/, ''))).catch(() => null);
      if (!buf) break;
      saved.push((await saveImage(buf, 'product'))[0]);
    }
    const ok =
      saved.length === images.length &&
      (await sql`UPDATE products SET images = ${sql.json(saved)}, source_images = ${sql.json(images)}, updated_at = now()
        WHERE id = ${p.id} AND images = ${sql.json(p.images)}`).count > 0;
    // Старые файлы с водяными знаками удаляем; если замена не удалась — удаляем только что сохранённые
    await removeUploads(...(ok ? p.images : saved));
    if (ok) changed++;
  }
  await sql`INSERT INTO settings (key, value) VALUES (${FLAG}, '1') ON CONFLICT (key) DO NOTHING`;
  return changed ? [`фото без водяных знаков у ${changed} товаров линолеума`] : [];
}

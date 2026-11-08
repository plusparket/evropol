// Сайт без названий брендов (решение владельца 08.11.2026, как раньше у линолеума и ковровой плитки): ни на главной,
// ни в каталогах разделов не видно брендов производителей и нет ссылок на технические паспорта (PDF). Фото товаров
// остаются как есть.
//
// upgradeNoBrands() — один раз при запуске (отметка no_brands_2026_11_08): выключает все бренды (логотипы на главной,
// бренд в карточке товара и фильтр «Производитель» пропадают), убирает названия брендов и ссылки на PDF из товаров,
// категорий, текстов разделов и описания главной для Google.
// cleanSeedProduct() — то же для товаров из seed/catalog при загрузке новых версий каталога (src/server/section-sites.ts).
import { sql } from './db.ts';

const FLAG = 'no_brands_2026_11_08';

/** Бренды производителей, которые были на сайте. Длинные названия раньше коротких: «Forbo Eurocol» до «Forbo» */
export const BRAND_NAMES = [
  'Associated Weavers', 'IVC Commercial', 'Forbo Eurocol', 'Mohawk Group', 'Fine Floor', 'CM Decking', 'BerryAlloc',
  'Beauflor', 'Beaulieu', 'Modulyss', 'Moduleo', 'Noventis', 'Tarkett', 'Eurocol', 'Mohawk', 'Kährs', 'Kahrs', 'Forbo',
  'ARLOK', 'Betap', 'Carus', 'Enviro', 'HARO', 'BLOQ', 'IVC', 'ITC',
];
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BRAND_RE = new RegExp(`(?<![\\p{L}\\d])(?:${BRAND_NAMES.map(escape).join('|')})(?![\\p{L}\\d])`, 'giu');

/** Есть ли в тексте название бренда */
export const hasBrand = (text: string) => new RegExp(BRAND_RE.source, 'iu').test(text);

/** Ссылки на PDF (технические паспорта, описания): абзац или пункт списка из одной ссылки — целиком, иначе ссылка */
function stripPdf(html: string): string {
  const pdfLink = String.raw`<a\b[^>]*href="[^"]*(?:\.pdf|pdf-)[^"]*"[^>]*>[\s\S]*?<\/a>`;
  return html
    .replace(new RegExp(String.raw`<(p|li)>\s*${pdfLink}\s*<\/\1>`, 'gi'), '')
    .replace(new RegExp(pdfLink, 'gi'), '');
}

/** Убирает названия брендов и ссылки на PDF и поправляет пробелы и знаки препинания вокруг */
export function stripBrands(text: string): string {
  if (!text) return text;
  return stripPdf(text)
    .replace(BRAND_RE, '')
    .replace(/\s*\((?:бренд|brand)\)/gi, '')
    .replace(/[ \t ]{2,}/g, ' ')
    .replace(/ +([,.;:!?)»])/g, '$1')
    .replace(/([(«]) +/g, '$1')
    .replace(/(<(?:p|li|h\d)[^>]*>) +/gi, '$1')
    .replace(/ +(<\/(?:p|li|h\d)>)/gi, '$1')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/^ +| +$/g, '');
}

/** Товары линейки ARLOK: название было «ARLOK 33», стало «Клей 33» (по тому, что это за товар) */
const ARLOK_NAMES: Record<string, string> = {
  '15': 'Грунтовка 15', '39': 'Фиксатор 39', '49': 'Фиксатор 49', '89': 'Шовная лента 89',
};
function productName(name: string): string {
  const m = name.match(/^ARLOK\s+(\d+)$/i);
  if (m) return ARLOK_NAMES[m[1]] ?? `Клей ${m[1]}`;
  return stripBrands(name) || name;
}

/** Бренды в адресах товаров: associated-weavers-atticus-32 → atticus-32 */
const BRAND_SLUGS = BRAND_NAMES.map((b) => b.toLowerCase().replace(/ä/g, 'a').replace(/\s+/g, '-'));
const ARLOK_SLUGS: Record<string, string> = { 'Клей': 'klej', 'Фиксатор': 'fiksator', 'Грунтовка': 'gruntovka', 'Шовная лента': 'shovnaya-lenta' };
/** Адрес товара без бренда. Если от адреса ничего не осталось, кроме номера, — по новому названию (arlok-33 → klej-33) */
export function productSlug(slug: string): string {
  const m = slug.match(/^arlok-(\d+)$/);
  if (m) {
    const name = productName(`ARLOK ${m[1]}`);
    const word = Object.keys(ARLOK_SLUGS).find((w) => name.startsWith(w));
    return word ? `${ARLOK_SLUGS[word]}-${m[1]}` : slug;
  }
  let t = `-${slug}-`;
  for (const b of BRAND_SLUGS) t = t.split(`-${b}-`).join('-');
  const out = t.replace(/^-+|-+$/g, '');
  return out && !/^\d+$/.test(out) ? out : slug;
}
/** Адреса категорий строительной химии с названием линейки ARLOK */
export const CATEGORY_SLUGS: Record<string, string> = { 'arlok-gibkie': 'diy-gibkie', 'arlok-parket': 'diy-parket', 'arlok-raznoe': 'diy-raznoe' };
export const categorySlug = (slug: string) => CATEGORY_SLUGS[slug] ?? slug;

type Attr = { label: string; value: string };
const cleanAttrs = (list: Attr[]) =>
  list
    .filter((a) => !/^(производитель|бренд)$/i.test(a.label.trim()) || !hasBrand(a.value))
    .map((a) => ({ label: a.label, value: stripBrands(a.value) }))
    .filter((a) => a.value);

type ProductTexts = { slug: string; name: string; collection: string; description: string; attributes: Attr[]; facets: Attr[]; specs: Attr[]; categories?: string[] };
/** Товар без брендов: адрес, название, коллекция, характеристики, значения фильтров, описание */
export function cleanSeedProduct<T extends ProductTexts>(p: T): T {
  return {
    ...p,
    slug: productSlug(p.slug),
    ...(p.categories ? { categories: p.categories.map(categorySlug) } : {}),
    name: productName(p.name),
    collection: stripBrands(p.collection),
    description: stripBrands(p.description),
    attributes: cleanAttrs(p.attributes),
    facets: cleanAttrs(p.facets),
    specs: cleanAttrs(p.specs),
  };
}

/** Новые тексты разделов вместо текстов с брендами (по адресу раздела и полю) */
const SECTION_TEXTS: Record<string, Partial<Record<SectionField, string>>> = {
  linoleum: { summary: 'Линолеум из Бельгии и России для квартир, офисов, школ и магазинов.' },
  carpet: { summary: 'Ковролин в рулонах из Бельгии и Нидерландов. Ширина рулона от 2 до 5 м.' },
  'carpet-tiles': { summary: 'Ковровая плитка для офисов, гостиниц и классов. Протёртую плитку меняют одну, без перестилки пола.' },
  vinyl: {
    summary: 'Кварцвиниловая доска, ёлочка и плитка SPC и LVT для квартир, офисов и магазинов.',
    description:
      '<p>Кварцвиниловый пол не боится воды, поэтому его кладут на кухне, в ванной, в прихожей и в торговом зале. ' +
      'LVT приклеивают к основанию. У SPC жёсткая основа из каменной муки и пластика и замок, его собирают без клея.</p>' +
      '<p>В каталоге доска, ёлочка и плитка с рисунком дерева и камня. Позвоните или напишите в WhatsApp: подскажем ' +
      'покрытие для вашей комнаты и рассчитаем метраж.</p>',
  },
  adhesives: {
    heading: 'Строительная химия',
    summary: 'Клеи, грунтовки, ровнители, лаки и средства ухода для полов, плитки и стен. Цену и наличие уточняйте по телефону или в WhatsApp.',
    description:
      '<p>В каталоге материалы для всех этапов укладки пола: грунтовки и самовыравнивающиеся смеси для основания, клеи ' +
      'для винила, линолеума, ковролина, плитки и паркета, лаки, масла и средства ухода. Для ремонта своими руками есть ' +
      'отдельная группа клеев и грунтовок.</p><p>Каталог разбит на группы. У каждого товара указаны расход, время работы и фасовка.</p>',
    seo_title: 'Строительная химия в Бишкеке: клеи, грунтовки, ровнители | ЕвроПол',
    seo_description: 'Клеи для линолеума, LVT, ковролина и паркета, грунтовки, наливные полы и лаки в Бишкеке. Расход, фасовка, наличие.',
  },
};
type SectionField = 'heading' | 'summary' | 'description' | 'seo_title' | 'seo_description';
const SECTION_FIELDS: SectionField[] = ['heading', 'summary', 'description', 'seo_title', 'seo_description'];

/** Группы и категории строительной химии с названием линейки ARLOK */
const CATEGORY_TEXTS: Record<string, { name: string; description: string }> = {
  diy: { name: 'Для ремонта своими руками', description: 'Клеи для линолеума, LVT, SPC, ковролина и паркета, грунтовка, ленты и холодная сварка.' },
  'arlok-gibkie': { name: 'Клеи для гибких покрытий', description: 'Клеи и фиксаторы для линолеума, LVT, SPC, кварцвинила и ковролина.' },
  'arlok-parket': { name: 'Паркетные клеи', description: 'Дисперсионные, SMP и полиуретановые клеи для паркета и доски.' },
};

/** Описание главной для Google без брендов (настройка seo_description) */
export const HOME_SEO_DESCRIPTION =
  'ЕвроПол: линолеум, ковролин, ковровая плитка, кварцвинил SPC и LVT, ламинат, паркет и строительная химия в Бишкеке. ' +
  'Образцы в магазине на ул. Матросова 6/1, тел. +996 (779) 37 72 73.';

/** Возвращает список изменений для журнала запуска. */
export async function upgradeNoBrands(): Promise<string[]> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return [];
  const log: string[] = [];
  await sql.begin(async (tx) => {
    const brands = await tx`UPDATE brands SET is_active = false WHERE is_active`;
    if (brands.count) log.push(`бренды скрыты: ${brands.count}`);

    let products = 0;
    const rows = await tx<(ProductTexts & { id: number; sectionId: number })[]>`
      SELECT id, section_id, slug, name, collection, description, attributes, facets, specs FROM products ORDER BY id`;
    const taken = new Set(rows.map((p) => `${p.sectionId}/${p.slug}`));
    for (const p of rows) {
      const c = cleanSeedProduct(p);
      // Новый адрес, только если в разделе нет товара с таким адресом
      if (c.slug !== p.slug && taken.has(`${p.sectionId}/${c.slug}`)) c.slug = p.slug;
      if (JSON.stringify(c) === JSON.stringify(p)) continue;
      taken.add(`${p.sectionId}/${c.slug}`);
      await tx`UPDATE products SET ${tx({
        slug: c.slug, name: c.name, collection: c.collection, description: c.description,
        attributes: tx.json(c.attributes), facets: tx.json(c.facets), specs: tx.json(c.specs),
      })}, updated_at = now() WHERE id = ${p.id}`;
      products++;
    }
    if (products) log.push(`товары без брендов и ссылок на PDF: ${products}`);

    for (const c of await tx<{ id: number; sectionId: number; slug: string; name: string; description: string }[]>`
      SELECT id, section_id, slug, name, description FROM product_categories`) {
      const next = hasBrand(`${c.name} ${c.description}`)
        ? (CATEGORY_TEXTS[c.slug] ?? { name: stripBrands(c.name), description: stripBrands(c.description) })
        : { name: c.name, description: c.description };
      const [busy] = await tx`SELECT 1 FROM product_categories WHERE section_id = ${c.sectionId} AND slug = ${categorySlug(c.slug)} AND id <> ${c.id}`;
      const slug = busy ? c.slug : categorySlug(c.slug);
      if (slug !== c.slug || next.name !== c.name || next.description !== c.description) {
        await tx`UPDATE product_categories SET slug = ${slug}, name = ${next.name}, description = ${next.description} WHERE id = ${c.id}`;
      }
    }

    for (const s of await tx<Record<string, string>[]>`
      SELECT id, slug, heading, summary, description, seo_title, seo_description FROM sections`) {
      const set: Partial<Record<SectionField, string>> = {};
      for (const f of SECTION_FIELDS) {
        // Строки из базы приходят с ключами в camelCase (seoTitle), в UPDATE имена столбцов — как в базе
        const text = s[f.replace(/_(\w)/g, (_, ch: string) => ch.toUpperCase())] ?? '';
        if (!hasBrand(stripPdf(text)) && stripPdf(text) === text) continue;
        set[f] = SECTION_TEXTS[s.slug]?.[f] ?? stripBrands(text);
      }
      if (Object.keys(set).length) {
        await tx`UPDATE sections SET ${tx(set)}, updated_at = now() WHERE id = ${s.id}`;
        log.push(`раздел «${s.slug}»: тексты без брендов`);
      }
    }

    const [seoRow] = await tx<{ value: string }[]>`SELECT value FROM settings WHERE key = 'seo_description'`;
    const seo = seoRow && hasBrand(seoRow.value)
      ? await tx`UPDATE settings SET value = ${HOME_SEO_DESCRIPTION} WHERE key = 'seo_description'`
      : { count: 0 };
    if (seo.count) log.push('описание главной для Google без брендов');
    await tx`INSERT INTO settings (key, value) VALUES (${FLAG}, '1') ON CONFLICT (key) DO NOTHING`;
  });
  return log;
}

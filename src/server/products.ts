// Каталог товаров сайта раздела: список с фильтрами, карточка товара.
// Товары принадлежат разделу (section_id); на главном сайте их нет, только на сайте раздела.
import { sql } from './db.ts';

export type Attr = { label: string; value: string };

export type Product = {
  id: number; sectionId: number; brandId: number | null; slug: string; name: string; collection: string; sku: string;
  attributes: Attr[]; facets: Attr[]; specs: Attr[]; description: string; images: string[]; sourceImages: string[];
  sourceUrl: string; seoTitle: string; seoDescription: string; sortOrder: number; isPublished: boolean; isNew: boolean; inStock: boolean;
  updatedAt: Date;
};
/** Товар в каталоге: с названием бренда */
export type ProductItem = Product & { brand: string };

/** Группа фильтра: «Формат» → [«Ёлочка» (8), «Плитка» (4)] */
export type FilterGroup = { label: string; values: { value: string; count: number; checked: boolean }[] };

/** Фильтр «Производитель» строится из бренда товара, остальные — из facets */
export const BRAND_FILTER = 'Производитель';

/** Миниатюра фото товара для каталога (копия 600 px, см. PRESETS.product в uploads.ts) */
export const productThumb = (rel: string) => rel.replace(/\.webp$/, '-600.webp');

/** Все опубликованные товары раздела с названием бренда: сначала «В наличии», дальше по порядку */
export async function getProducts(sectionId: number): Promise<ProductItem[]> {
  return sql<ProductItem[]>`
    SELECT p.*, coalesce(b.name, '') AS brand FROM products p LEFT JOIN brands b ON b.id = p.brand_id AND b.is_active
    WHERE p.section_id = ${sectionId} AND p.is_published
    ORDER BY p.in_stock DESC, p.sort_order, p.id`;
}

/** Категория товаров: группа верхнего уровня (parentId = null) или категория внутри группы */
export type Category = {
  id: number; sectionId: number; parentId: number | null; slug: string; name: string; description: string; sortOrder: number; isActive: boolean;
};
/** Категория на сайте: подкатегории и id товаров (свои и подкатегорий) */
export type CategoryNode = Category & { children: CategoryNode[]; productIds: number[] };

/** Видимые категории раздела деревом: группы → категории. Пустые категории (без опубликованных товаров) не показываются. */
export async function getCategoryTree(sectionId: number): Promise<CategoryNode[]> {
  const rows = await sql<(Category & { productIds: number[] })[]>`
    SELECT c.*, coalesce(array_agg(i.product_id ORDER BY i.product_id) FILTER (WHERE p.id IS NOT NULL), '{}') AS product_ids
    FROM product_categories c
    LEFT JOIN product_category_items i ON i.category_id = c.id
    LEFT JOIN products p ON p.id = i.product_id AND p.is_published
    WHERE c.section_id = ${sectionId} AND c.is_active
    GROUP BY c.id ORDER BY c.sort_order, c.id`;
  const nodes = rows.map((r) => ({ ...r, children: [] as CategoryNode[] }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots: CategoryNode[] = [];
  for (const n of nodes) {
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    if (parent) parent.children.push(n);
    else if (!n.parentId) roots.push(n);
  }
  for (const g of roots) {
    g.children = g.children.filter((c) => c.productIds.length);
    g.productIds = [...new Set([...g.productIds, ...g.children.flatMap((c) => c.productIds)])];
  }
  return roots.filter((g) => g.productIds.length);
}

/** Товары категории по порядку каталога (сначала «В наличии») */
export function productsOf(all: ProductItem[], c: Pick<CategoryNode, 'productIds'>): ProductItem[] {
  const ids = new Set(c.productIds);
  return all.filter((p) => ids.has(p.id));
}

export async function getProductBySlug(sectionId: number, slug: string): Promise<ProductItem | undefined> {
  const [p] = await sql<ProductItem[]>`
    SELECT p.*, coalesce(b.name, '') AS brand FROM products p LEFT JOIN brands b ON b.id = p.brand_id AND b.is_active
    WHERE p.section_id = ${sectionId} AND p.slug = ${slug} AND p.is_published`;
  return p;
}

/** Значения товара для фильтров: бренд и facets */
function facetPairs(p: ProductItem): Attr[] {
  return p.brand ? [{ label: BRAND_FILTER, value: p.brand }, ...p.facets] : p.facets;
}

/** Выбранные фильтры из адреса: ?f=Формат:Ёлочка&f=Цвет пола:светло-серый */
export function parseFilters(params: URLSearchParams): Map<string, Set<string>> {
  const chosen = new Map<string, Set<string>>();
  for (const raw of params.getAll('f')) {
    const i = raw.indexOf(':');
    if (i <= 0) continue;
    const label = raw.slice(0, i);
    if (!chosen.has(label)) chosen.set(label, new Set());
    chosen.get(label)!.add(raw.slice(i + 1));
  }
  return chosen;
}

/**
 * Фильтрует товары и считает, сколько товаров у каждого значения фильтра.
 * Внутри группы значения складываются (Ёлочка или Плитка), группы между собой — пересекаются.
 * Счётчик значения учитывает выбор в других группах, как в каталогах HARO и BerryAlloc.
 * Группа показывается, если у товаров раздела в ней больше одного значения.
 * Значения идут по первому появлению у товаров, с sortValues — по алфавиту и числам (2 мм, 2,5 мм, 3 мм).
 */
export function applyFilters(
  products: ProductItem[],
  chosen: Map<string, Set<string>>,
  { sortValues = false } = {},
): { items: ProductItem[]; groups: FilterGroup[] } {
  const matches = (p: ProductItem, skip?: string) =>
    [...chosen].every(([label, values]) => label === skip || facetPairs(p).some((f) => f.label === label && values.has(f.value)));

  const order: string[] = [];
  const all = new Map<string, Set<string>>();
  for (const p of products) {
    for (const f of facetPairs(p)) {
      if (!all.has(f.label)) { all.set(f.label, new Set()); order.push(f.label); }
      all.get(f.label)!.add(f.value);
    }
  }
  const groups: FilterGroup[] = [];
  for (const label of order) {
    const values = [...all.get(label)!];
    if (sortValues) values.sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
    if (values.length < 2) continue;
    const pool = products.filter((p) => matches(p, label));
    groups.push({
      label,
      values: values.map((value) => ({
        value,
        count: pool.filter((p) => facetPairs(p).some((f) => f.label === label && f.value === value)).length,
        checked: chosen.get(label)?.has(value) ?? false,
      })),
    });
  }
  return { items: products.filter((p) => matches(p)), groups };
}

/** «Похожие»: та же коллекция, затем тот же формат */
export function relatedProducts(all: ProductItem[], p: ProductItem, max = 4): ProductItem[] {
  const fmt = p.facets.find((f) => f.label === 'Формат')?.value;
  const score = (x: ProductItem) => (x.collection === p.collection ? 2 : 0) + (fmt && x.facets.some((f) => f.label === 'Формат' && f.value === fmt) ? 1 : 0);
  return all.filter((x) => x.id !== p.id).sort((a, b) => score(b) - score(a)).slice(0, max);
}

/** Категории товара: [группа, категория] для каждой категории, где он есть (первая — главная, для крошек) */
export function categoryPaths(tree: CategoryNode[], productId: number): CategoryNode[][] {
  const paths: CategoryNode[][] = [];
  for (const g of tree) {
    for (const c of g.children) if (c.productIds.includes(productId)) paths.push([g, c]);
    if (!g.children.length && g.productIds.includes(productId)) paths.push([g]);
  }
  return paths;
}

/** «Похожие» на сайте с категориями: товары той же категории, сначала «В наличии» */
export function relatedInCategory(all: ProductItem[], p: ProductItem, category: CategoryNode | undefined, max = 4): ProductItem[] {
  return category ? productsOf(all, category).filter((x) => x.id !== p.id).slice(0, max) : [];
}

/** «1,73419 м²» → 1.73419 (для калькулятора упаковок) */
export function packArea(p: Pick<Product, 'specs'>): number | null {
  const spec = p.specs.find((s) => /м²\s*в\s*упаковке/i.test(s.label));
  const n = spec ? Number.parseFloat(spec.value.replace(/\s/g, '').replace(',', '.')) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Пары «подпись — значение» из формы админки; пустые строки отбрасываются */
export function normalizeAttrs(labels: string[], values: string[]): Attr[] {
  return labels
    .map((label, i) => ({ label: label.trim(), value: (values[i] ?? '').trim() }))
    .filter((a) => a.label && a.value);
}

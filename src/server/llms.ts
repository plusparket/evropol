// llms.txt и llms-full.txt (стандарт https://llmstxt.org) — сайт для ИИ-ассистентов и LLM-агентов.
// Собираются из базы при каждом запросе, поэтому всегда совпадают с сайтом: правки в админке попадают в них сразу.
// Правила поддержки — AGENTS.md.
//
// В файлы попадает только то, что видно на сайте: опубликованные разделы с их сайтами, включённые бренды,
// страницы и новости. У каждого сайта раздела (vinyl.localhost …) свои файлы: раздел, бренды, товары
// (buildSiteLlmsTxt и buildSiteLlmsFullTxt).
import { sql } from './db.ts';
import { getHome } from './home.ts';
import { getActiveBrands, getSections, linkLabel, sectionLink, siteUrl, type Brand, type Section } from './sections.ts';
import { categoryPaths, getCategoryTree, getProducts, type CategoryNode, type ProductItem } from './products.ts';
import { pluralRu } from './util.ts';
import { fillPlaceholders, getSettings, siteSettings, type Settings } from './settings.ts';

const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", laquo: '«', raquo: '»',
  mdash: '—', ndash: '–', hellip: '…', deg: '°', times: '×', sup2: '²', sup3: '³',
};
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z0-9]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);

/** HTML из админки → простой Markdown: абзацы, списки, жирный, ссылки (относительные — полными адресами) */
export function htmlToMd(html: string, base: string): string {
  const abs = (href: string) => (/^(https?:|mailto:|tel:)/i.test(href) ? href : base + (href.startsWith('/') ? '' : '/') + href);
  return decode(
    html
      .replace(/<(script|style|iframe|video)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, t: string) => {
        const text = t.replace(/<[^>]+>/g, '').trim();
        return text && href && !href.startsWith('#') ? `[${text}](${abs(href)})` : text;
      })
      .replace(/<(b|strong)>\s*([\s\S]*?)\s*<\/\1>/gi, (_, _t: string, t: string) => (t.trim() ? `**${t.trim()}**` : ''))
      .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n**$1**\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<\/t[dh]>/gi, ' · ')
      .replace(/<\/?(p|div|section|ul|ol|table|tr|h\d|blockquote)[^>]*>/gi, '\n\n')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').replace(/\s*·\s*$/, '').trim())
    .join('\n')
    .replace(/\*\*\s*\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Одна строка без разметки, не длиннее max символов */
const oneLine = (md: string, max = 220) => {
  const s = md.replace(/\*\*|\[|\]\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
};

type Data = {
  base: string;
  settings: Settings;
  home: Awaited<ReturnType<typeof getHome>>;
  sections: Section[];
  brands: Brand[];
  pages: { slug: string; title: string; content: string }[];
  news: { id: number; slug: string; title: string; excerpt: string; content: string; publishedAt: Date }[];
};

async function load(origin: string): Promise<Data> {
  const base = (process.env.SITE_URL || origin).replace(/\/$/, '');
  const [settings, home, sections, brands, pages, news] = await Promise.all([
    getSettings(),
    getHome(),
    getSections({ publishedOnly: true }),
    getActiveBrands(),
    sql<Data['pages']>`SELECT slug, title, content FROM pages WHERE is_published ORDER BY id`,
    sql<Data['news']>`
      SELECT id, slug, title, excerpt, content, published_at FROM news
      WHERE is_published AND published_at <= now() ORDER BY published_at DESC`,
  ]);
  return { base, settings, home, sections, brands, pages, news };
}

const abs = (d: Data, url: string) => (/^https?:/i.test(url) ? url : `${d.base}${url.startsWith('/') ? '' : '/'}${url}`);
const brandsOf = (d: Data, s: Section) => d.brands.filter((b) => b.sectionId === s.id);
/** Бренды без раздела */
const looseBrands = (d: Data) => d.brands.filter((b) => !d.sections.some((s) => s.id === b.sectionId));

function summary(d: Data): string {
  const s = d.settings;
  // «Ковровая плитка» → «ковровая плитка», но аббревиатуры («SPC / LVT …») не трогаем
  const lower = (n: string) => (/^\p{Lu}\p{Ll}/u.test(n) ? n[0].toLowerCase() + n.slice(1) : n);
  const names = d.sections.map((x) => lower(x.name)).join(', ');
  return `${s.site_name}: поставщик напольных покрытий в Бишкеке (Кыргызстан)${names ? `: ${names}` : ''}. ` +
    `Офис: ${s.address}. Телефон ${s.phone_main}.`;
}

/** mainContact — ссылка на страницу контактов главного сайта (у сайта раздела со своим адресом её нет) */
function contacts(d: Data, mainContact = true): string[] {
  const s = d.settings;
  const wa = s.panel_whatsapp ? `, WhatsApp ${s.panel_whatsapp} (https://wa.me/${s.panel_whatsapp.replace(/\D/g, '')})` : '';
  const lines = [
    `- Офис «${s.site_name}»: ${s.address}, Кыргызстан. Телефон ${s.phone_main}.` +
      (s.work_hours ? ` Режим работы: ${s.work_hours}.` : '') + (s.geo ? ` Координаты: ${s.geo}.` : ''),
  ];
  if (s.address_second || s.phone_second) {
    lines.push(
      `- ${s.name_second || 'Второй адрес'}: ${s.address_second}, Кыргызстан.` + (s.phone_second ? ` Телефон ${s.phone_second}.` : '') +
        (s.work_hours_second ? ` Режим работы: ${s.work_hours_second}.` : '') + (s.geo_second ? ` Координаты: ${s.geo_second}.` : ''),
    );
  }
  lines.push(`- Email: ${s.email}${wa}.`);
  if (s.instagram_url) lines.push(`- Instagram: ${s.instagram_url}`);
  if (mainContact) lines.push(`- [Контакты и карта](${d.base}/contact)`);
  return lines;
}

/** /llms.txt — обзор: компания, контакты, разделы с их сайтами, бренды, страницы, новости */
export async function buildLlmsTxt(origin: string): Promise<string> {
  const d = await load(origin);
  const out: string[] = [`# ${d.settings.site_name}`, '', `> ${summary(d)}`, ''];
  if (d.home.about.title && d.home.about.text) out.push(oneLine(htmlToMd(fillPlaceholders(d.home.about.text, d.settings), d.base), 600), '');
  out.push(
    'Этот сайт рассказывает о компании и разделах. Коллекции, цены и заказ — на сайте каждого раздела; ' +
      'если у раздела сайта пока нет, цену и наличие уточняйте по телефону или в WhatsApp.',
    '',
  );
  out.push('## Контакты', '', ...contacts(d), '');

  out.push('## Разделы', '');
  for (const s of d.sections) {
    const brands = brandsOf(d, s).map((b) => b.name).join(', ');
    const link = sectionLink(s);
    const site = link ? ` · ${linkLabel(s)}: ${abs(d, link)}` : '';
    out.push(`- [${s.heading || s.name}](${d.base}/${s.slug})${brands ? `: ${brands}` : ''}${site}`);
  }
  for (const b of looseBrands(d)) out.push(`- ${b.name}${b.link ? `: ${abs(d, b.link)}` : ''}`);
  out.push('');

  out.push('## Страницы', '');
  out.push(`- [Главная](${d.base}/)`);
  for (const p of d.pages) out.push(`- [${p.title}](${d.base}/${p.slug}): ${oneLine(htmlToMd(fillPlaceholders(p.content, d.settings), d.base), 140)}`);
  if (d.news.length) {
    out.push(`- [Новости и события](${d.base}/news)`);
    for (const n of d.news) out.push(`  - [${n.title}](${d.base}/news/${n.slug}) · ${new Date(n.publishedAt).toLocaleDateString('ru-RU')}`);
  }
  out.push('');

  out.push('## Optional', '');
  out.push(`- [Полная версия](${d.base}/llms-full.txt): тексты разделов, описания брендов, страницы и новости`);
  out.push(`- [Карта сайта](${d.base}/sitemap.xml)`);
  return out.join('\n') + '\n';
}

/** /llms-full.txt — всё содержимое: компания, контакты, разделы и бренды целиком, страницы, новости */
export async function buildLlmsFullTxt(origin: string): Promise<string> {
  const d = await load(origin);
  const md = (html: string) => htmlToMd(fillPlaceholders(html, d.settings), d.base);
  const out: string[] = [`# ${d.settings.site_name}: полная информация`, '', `> ${summary(d)}`, ''];
  out.push(`Сайт: ${d.base}. Данные собраны с сайта ${new Date().toLocaleDateString('ru-RU')} и всегда совпадают с ним.`, '');

  if (d.home.about.title && d.home.about.text) out.push('## О компании', '', md(d.home.about.text), '');
  out.push('Коллекции, цены и заказ — на сайте каждого раздела; если у раздела сайта пока нет, уточняйте по телефону или в WhatsApp.', '');
  out.push('## Контакты', '', ...contacts(d), '');

  out.push('## Разделы', '');
  for (const s of d.sections) {
    out.push(`### ${s.heading || s.name}`, '', `Адрес: ${d.base}/${s.slug}`);
    if (sectionLink(s)) out.push(`${linkLabel(s)}: ${abs(d, sectionLink(s))}`);
    if (s.description) out.push('', md(s.description));
    for (const b of brandsOf(d, s)) {
      out.push('', `**${b.name}**${b.link ? ` (коллекции: ${abs(d, b.link)})` : ''}`);
      if (b.description) out.push('', md(b.description));
    }
    out.push('');
  }
  if (looseBrands(d).length) {
    out.push('## Другие производители', '');
    for (const b of looseBrands(d)) {
      out.push(`### ${b.name}`, '');
      if (b.link) out.push(`Коллекции: ${abs(d, b.link)}`, '');
      if (b.description) out.push(md(b.description), '');
    }
  }

  out.push('## Страницы', '');
  for (const p of d.pages) {
    out.push(`### ${p.title}`, '', `Адрес: ${d.base}/${p.slug}`, '', md(p.content), '');
  }

  if (d.news.length) {
    out.push('## Новости и события', '');
    for (const n of d.news) {
      out.push(`### ${n.title}`, '', `Адрес: ${d.base}/news/${n.slug} · ${new Date(n.publishedAt).toLocaleDateString('ru-RU')}`, '');
      const text = md(n.content || n.excerpt);
      if (text) out.push(text, '');
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

// --- Сайты разделов ------------------------------------------------------------------------------

type SiteData = Data & { site: Section; siteBase: string; products: ProductItem[]; tree: CategoryNode[] };

async function loadSite(site: Section): Promise<SiteData> {
  const d = await load('http://localhost');
  // Группы и категории есть только у вида «Группы и категории товаров»: в других видах сайт их не показывает
  const tree = site.siteLayout === 'groups' ? await getCategoryTree(site.id) : [];
  return { ...d, settings: siteSettings(d.settings, site), site, siteBase: siteUrl(site), products: await getProducts(site.id), tree };
}

const productLine = (p: ProductItem) => [p.brand, p.collection, p.name].filter(Boolean).join(' ');

/** Категории товара словами: «Подготовка основания › Грунтовки; Продукты ARLOK › …» */
const categoriesOf = (d: SiteData, p: ProductItem) =>
  categoryPaths(d.tree, p.id).map((path) => path.map((c) => c.name).join(' › ')).join('; ');

/** Группы и категории со ссылками на страницы сайта */
function categoryList(d: SiteData, md: (html: string) => string): string[] {
  const out: string[] = [];
  const line = (c: CategoryNode, indent: string) =>
    `${indent}- [${c.name}](${d.siteBase}/${c.slug})${c.description ? `: ${oneLine(md(c.description), 200)}` : ''} (${c.productIds.length} ${pluralRu(c.productIds.length, ['товар', 'товара', 'товаров'])})`;
  for (const g of d.tree) {
    out.push(line(g, ''));
    for (const c of g.children) out.push(line(c, '  '));
  }
  return out;
}

function siteHeader(d: SiteData, full: boolean): string[] {
  const s = d.site;
  const heading = s.heading || s.name;
  const out = [`# ${heading}: ${d.settings.site_name}${full ? ', полная информация' : ''}`, ''];
  out.push(`> ${(s.summary || heading).replace(/\.$/, '')}. Сайт раздела «${s.name}» компании «${d.settings.site_name}» (Бишкек, Кыргызстан). ` +
    `Офис: ${d.settings.address}. Телефон ${d.settings.phone_main}.`, '');
  const stock = d.products.filter((p) => p.inStock).length;
  out.push(`Каталог на сайте: ${d.products.length} ${pluralRu(d.products.length, ['товар', 'товара', 'товаров'])}` +
    (stock ? `, из них ${stock} с меткой «В наличии» (в каталоге они идут первыми)` : '') + '. ' +
    'Цен на сайте нет: цену и наличие сообщают по телефону или в WhatsApp.' + (s.siteLayout === 'groups' ? '' : ' Образцы есть в офисе.'), '');
  // Виды «только каталог» и «группы и категории» не ссылаются на главный сайт — и здесь его нет
  if (!['catalog', 'groups'].includes(s.siteLayout)) out.push(`Главный сайт компании со всеми разделами: ${d.base}/`, '');
  return out;
}

/** /llms.txt сайта раздела: раздел, контакты, бренды, список товаров */
export async function buildSiteLlmsTxt(site: Section): Promise<string> {
  const d = await loadSite(site);
  const md = (html: string) => htmlToMd(fillPlaceholders(html, d.settings), d.siteBase);
  const out = siteHeader(d, false);
  if (site.description) out.push(oneLine(md(site.description), 600), '');
  out.push('## Контакты', '', ...contacts(d, !site.siteAddress && !['catalog', 'groups'].includes(site.siteLayout)), '');
  const brands = brandsOf(d, site);
  if (brands.length) {
    out.push('## Производители', '');
    for (const b of brands) out.push(`- ${b.name}${b.description ? `: ${oneLine(md(b.description), 160)}` : ''}${b.link ? ` (${abs(d, b.link)})` : ''}`);
    out.push('');
  }
  if (d.tree.length) out.push('## Группы и категории', '', ...categoryList(d, md), '');
  if (d.products.length) {
    out.push('## Каталог', '');
    for (const p of d.products) {
      const facts = p.attributes.map((a) => a.value).join(', ');
      const cats = categoriesOf(d, p);
      out.push(`- [${productLine(p)}](${d.siteBase}/${p.slug})${p.inStock ? ' · в наличии' : ''}${p.isNew ? ' · новинка' : ''}` +
        `${p.sku ? ` · артикул ${p.sku}` : ''}${cats ? ` · категория: ${cats}` : ''}${facts ? ` · ${oneLine(facts, 200)}` : ''}`);
    }
    out.push('');
  }
  out.push('## Optional', '');
  out.push(`- [Полная версия](${d.siteBase}/llms-full.txt): описания и характеристики всех товаров`);
  out.push(`- [Карта сайта](${d.siteBase}/sitemap.xml)`);
  return out.join('\n') + '\n';
}

/** /llms-full.txt сайта раздела: всё о разделе и каждый товар с описанием и таблицей характеристик */
export async function buildSiteLlmsFullTxt(site: Section): Promise<string> {
  const d = await loadSite(site);
  const md = (html: string) => htmlToMd(fillPlaceholders(html, d.settings), d.siteBase);
  const out = siteHeader(d, true);
  out.push(`Сайт: ${d.siteBase}. Данные собраны с сайта ${new Date().toLocaleDateString('ru-RU')} и всегда совпадают с ним.`, '');
  if (site.description) out.push(`## ${site.siteLayout === 'groups' ? 'О продукции' : 'О покрытии'}`, '', md(site.description), '');
  out.push('## Контакты', '', ...contacts(d, !site.siteAddress && !['catalog', 'groups'].includes(site.siteLayout)), '');
  const brands = brandsOf(d, site);
  if (brands.length) {
    out.push('## Производители', '');
    for (const b of brands) {
      out.push(`### ${b.name}`, '');
      if (b.link) out.push(`Коллекции: ${abs(d, b.link)}`, '');
      if (b.description) out.push(md(b.description), '');
    }
  }
  if (d.tree.length) out.push('## Группы и категории', '', ...categoryList(d, md), '');
  if (d.products.length) {
    out.push('## Каталог', '');
    for (const p of d.products) {
      const cats = categoriesOf(d, p);
      out.push(`### ${productLine(p)}`, '',
        `Адрес: ${d.siteBase}/${p.slug}${p.sku ? ` · артикул ${p.sku}` : ''}${p.inStock ? ' · в наличии' : ''}${p.isNew ? ' · новинка' : ''}`, '');
      if (cats) out.push(`Категория: ${cats}`, '');
      if (p.description) out.push(md(p.description), '');
      for (const sp of p.specs) out.push(`- ${sp.label}: ${sp.value}`);
      if (p.specs.length) out.push('');
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

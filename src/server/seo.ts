// Поисковая оптимизация: заголовки и описания страниц по умолчанию, разметка schema.org (JSON-LD).
// Если в админке у раздела или страницы заполнены «SEO-заголовок» / «SEO-описание» — берутся они.
import type { Settings } from './settings.ts';
import type { Section } from './sections.ts';
import type { ProductItem } from './products.ts';
import { pluralRu, plainText } from './util.ts';

export const CITY = 'Бишкек';
/** Адрес без «г. Бишкек,» в начале — для streetAddress в разметке Google (город указан отдельно). */
export const streetOnly = (a: string) => a.replace(/^г\.\s*Бишкек,\s*/i, '');

/** Адрес сайта для абсолютных ссылок (canonical, og:url, разметка). */
export const siteBase = (fallbackOrigin: string) => (process.env.SITE_URL || fallbackOrigin).replace(/\/$/, '');

/** «Винил» → «Винил | Европроект» */
export const withSiteName = (title: string, s: Settings) => (title.includes(s.site_name) ? title : `${title} | ${s.site_name}`);

/**
 * Обрезка по границе слова для meta description. Google показывает в выдаче около 160 знаков,
 * поэтому главное — в начале, контакты — в конце, если помещаются.
 */
export function clip(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s,.;:—-]+$/, '') + '…';
}


export function sectionTitle(heading: string, s: Settings): string {
  return withSiteName(`${heading} в Бишкеке`, s);
}

export function sectionDescription(heading: string, s: Settings): string {
  return withTail(`${heading} в Бишкеке от компании «${s.site_name}»: коллекции европейских производителей, образцы, консультация и расчёт.`, `Тел. ${s.phone_main}.`);
}

// --- Сайты разделов: описания для выдачи Google ---------------------------------------------

/** Описание + хвост с городом или телефоном: описание укорачивается, чтобы хвост всегда поместился в 160 знаков */
function withTail(text: string, tail: string, max = 160): string {
  const room = max - tail.length - 1;
  // Сначала целые предложения: «…» посреди фразы в выдаче выглядит хуже, чем короткое описание
  let t = '';
  for (const sentence of text.replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]*\s*/g) ?? []) {
    if ((t + sentence).trim().length > room) break;
    t += sentence;
  }
  t = t.trim().length >= room * 0.5 ? t.trim() : clip(text, room - 1);
  if (!t) return tail;
  return t + (/[.!?…]$/.test(t) ? ' ' : '. ') + tail;
}

/** Главная сайта раздела: краткое описание, число товаров и наличие, город и телефон */
export function sectionSiteDescription(site: Section, products: ProductItem[], s: Settings): string {
  if (site.seoDescription) return site.seoDescription;
  const inStock = products.filter((p) => p.inStock).length;
  const count = products.length
    ? `${products.length} ${pluralRu(products.length, ['позиция', 'позиции', 'позиций'])} в каталоге` + (inStock ? `, ${inStock} в наличии` : '') + '.'
    : '';
  const lead = site.summary || plainText(site.description, 400);
  return withTail([lead, count].filter(Boolean).join(lead && !/[.!?…]$/.test(lead) ? '. ' : ' '), `Бишкек, тел. ${s.phone_main}.`);
}

/** Группа или категория товаров (строительная химия): её описание, число товаров, город */
export function categoryDescription(name: string, description: string, count: number, s: Settings): string {
  const lead = description || `${name}: ${count} ${pluralRu(count, ['товар', 'товара', 'товаров'])} в каталоге.`;
  return withTail(lead, `Бишкек, тел. ${s.phone_main}.`);
}

/** Страница товара: начало описания, «В наличии в Бишкеке» или телефон */
export function productDescription(p: ProductItem, s: Settings): string {
  if (p.seoDescription) return p.seoDescription;
  const lead = plainText(p.description, 400) || [p.brand, p.collection, p.name].filter(Boolean).join(' ');
  return withTail(lead, p.inStock ? 'В наличии в Бишкеке.' : `Бишкек, тел. ${s.phone_main}.`);
}

// --- Разметка schema.org ----------------------------------------------------------------

const DAYS: Record<string, string> = { mo: 'Monday', tu: 'Tuesday', we: 'Wednesday', th: 'Thursday', fr: 'Friday', sa: 'Saturday', su: 'Sunday' };
const DAY_KEYS = Object.keys(DAYS);

/**
 * «Mo-Sa 09:00-17:00; Su 10:00-15:00» → openingHoursSpecification.
 * Неправильные части пропускаются (часы просто не попадут в разметку).
 */
export function parseOpeningHours(text: string) {
  const specs: { '@type': 'OpeningHoursSpecification'; dayOfWeek: string[]; opens: string; closes: string }[] = [];
  for (const part of text.split(/[;,\n]+/)) {
    const m = part.trim().match(/^([a-z]{2})(?:\s*-\s*([a-z]{2}))?\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/i);
    if (!m) continue;
    const from = DAY_KEYS.indexOf(m[1].toLowerCase());
    const to = m[2] ? DAY_KEYS.indexOf(m[2].toLowerCase()) : from;
    if (from < 0 || to < from) continue;
    const pad = (t: string) => t.padStart(5, '0');
    specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: DAY_KEYS.slice(from, to + 1).map((d) => DAYS[d]), opens: pad(m[3]), closes: pad(m[4]) });
  }
  return specs;
}

/** Пустой список в разметку не пишем */
const orUndef = <T,>(list: T[]) => (list.length ? list : undefined);

const e164 = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits ? `+${digits}` : undefined;
};

function geo(text: string) {
  const m = text.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);
  return m ? { '@type': 'GeoCoordinates', latitude: Number(m[1]), longitude: Number(m[2]) } : undefined;
}

/** Организация, сайт и офис (и второй адрес, если задан) — на главной и на странице «Контакты». */
export function organizationJsonLd(s: Settings, base: string, image?: string) {
  const orgId = `${base}/#organization`;
  const sameAs = [s.instagram_url, s.facebook_url].filter((u) => /^https?:\/\//.test(u));
  const store = (id: string, name: string, address: string, phone: string, hours: string, coords: string) => ({
    '@type': 'LocalBusiness',
    '@id': `${base}/#${id}`,
    name,
    url: `${base}/`,
    image: image ?? `${base}/apple-touch-icon.png`,
    telephone: e164(phone),
    email: s.email || undefined,
    address: { '@type': 'PostalAddress', streetAddress: streetOnly(address), addressLocality: CITY, addressCountry: 'KG' },
    geo: geo(coords),
    openingHoursSpecification: orUndef(parseOpeningHours(hours)),
    parentOrganization: { '@id': orgId },
  });
  const stores = [store('office', s.site_name, s.address, s.phone_main, s.hours_schema, s.geo)];
  if (s.address_second) {
    stores.push(store('store2', s.name_second || s.site_name, s.address_second, s.phone_second, s.hours_schema_second, s.geo_second));
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: s.site_name,
        url: `${base}/`,
        logo: `${base}/apple-touch-icon.png`,
        email: s.email || undefined,
        telephone: e164(s.phone_main),
        sameAs: sameAs.length ? sameAs : undefined,
      },
      { '@type': 'WebSite', '@id': `${base}/#website`, name: s.site_name, url: `${base}/`, inLanguage: 'ru', publisher: { '@id': orgId } },
      ...stores,
    ],
  };
}

/** Хлебные крошки для Google: Главная → раздел. */
export function breadcrumbJsonLd(base: string, items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Главная', url: '/' }, ...items].map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${base}${it.url}`,
    })),
  };
}

/**
 * Главная сайта раздела: магазин раздела (адрес, телефон, часы, координаты) и сам сайт.
 * Магазин связан с компанией на главном сайте (parentOrganization), чтобы Google видел одну компанию.
 */
export function sectionSiteJsonLd(site: Section, s: Settings, base: string, mainBase: string, image?: string) {
  const heading = site.heading || site.name;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Store',
        '@id': `${base}/#store`,
        name: `${s.site_name}: ${site.name}`,
        description: site.summary || undefined,
        url: `${base}/`,
        image: image ?? `${mainBase}/img/og-evropol.jpg`,
        telephone: e164(s.phone_main),
        email: s.email || undefined,
        address: { '@type': 'PostalAddress', streetAddress: streetOnly(s.address), addressLocality: CITY, addressCountry: 'KG' },
        geo: geo(s.geo),
        openingHoursSpecification: orUndef(parseOpeningHours(s.hours_schema)),
        areaServed: { '@type': 'Country', name: 'Кыргызстан' },
        parentOrganization: { '@type': 'Organization', '@id': `${mainBase}/#organization`, name: s.site_name, url: `${mainBase}/` },
      },
      { '@type': 'WebSite', '@id': `${base}/#website`, name: `${heading} · ${s.site_name}`, url: `${base}/`, inLanguage: 'ru', publisher: { '@id': `${base}/#store` } },
    ],
  };
}

/**
 * Чем товар отличается от товаров с тем же брендом, названием и коллекцией (один декор в двух форматах):
 * первая характеристика, которой у них нет, иначе артикул. Пусто — товар с таким названием один.
 * Добавляется в заголовок страницы: у разных страниц в Google должны быть разные заголовки.
 */
export function namesakeSuffix(p: ProductItem, all: ProductItem[]): string {
  const key = (x: ProductItem) => [x.brand, x.name, x.collection].join('|').toLowerCase();
  const twins = all.filter((o) => o.id !== p.id && key(o) === key(p));
  if (!twins.length) return '';
  const own = [...p.attributes, ...p.specs];
  const diff = own.find((a) => a.value && twins.every((o) => ![...o.attributes, ...o.specs].some((b) => b.label === a.label && b.value === a.value)));
  if (diff) return diff.value.charAt(0).toLowerCase() + diff.value.slice(1);
  return p.sku ? `арт. ${p.sku}` : '';
}

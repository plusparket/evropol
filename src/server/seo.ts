// Поисковая оптимизация: заголовки и описания страниц по умолчанию, разметка schema.org (JSON-LD).
// Если в админке у раздела или страницы заполнены «SEO-заголовок» / «SEO-описание» — берутся они.
import type { Settings } from './settings.ts';

export const CITY = 'Бишкек';
/** Адрес без «г. Бишкек,» в начале — для streetAddress в разметке Google (город указан отдельно). */
export const streetOnly = (a: string) => a.replace(/^г\.\s*Бишкек,\s*/i, '');

/** Адрес сайта для абсолютных ссылок (canonical, og:url, разметка). */
export const siteBase = (fallbackOrigin: string) => (process.env.SITE_URL || fallbackOrigin).replace(/\/$/, '');

/** «Винил» → «Винил | Европроект» */
export const withSiteName = (title: string, s: Settings) => (title.includes(s.site_name) ? title : `${title} | ${s.site_name}`);

/** Обрезка по границе слова для meta description. */
function clip(text: string, max = 250): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s,.;:—-]+$/, '') + '…';
}

const contactsLine = (s: Settings) => `Офис: ${s.address}. Тел. ${s.phone_main}.`;

export function sectionTitle(heading: string, s: Settings): string {
  return withSiteName(`${heading} в Бишкеке`, s);
}

export function sectionDescription(heading: string, s: Settings): string {
  return clip(`${heading} в Бишкеке от компании «${s.site_name}»: коллекции европейских производителей, образцы, консультация и расчёт. ${contactsLine(s)}`);
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
    openingHoursSpecification: parseOpeningHours(hours),
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

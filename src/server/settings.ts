import { sql } from './db.ts';

/** Каталоги в дизайне по образцу mohawkflooring.com: все разделы с каталогом (владелец, 09.11.2026) */
export const MOHAWK_ALL = 'linoleum, carpet, carpet-tiles, vinyl, laminate, adhesives';

/** Все настройки сайта с подписями для админки и значениями по умолчанию. */
export const SETTINGS_SCHEMA = [
  { group: 'Общее', key: 'site_name', label: 'Название компании (в заголовках страниц и разметке для Google)', default: 'ЕвроПол' },
  { group: 'Общее', key: 'seo_title', label: 'Заголовок главной страницы (title)', default: 'Напольные покрытия в Бишкеке: магазин ЕвроПол' },
  { group: 'Общее', key: 'seo_description', label: 'Описание главной для поисковиков (meta description)', type: 'textarea',
    default: 'Линолеум, ковролин, ковровая плитка, кварцвинил, ламинат, паркет и строительная химия в Бишкеке. Магазин на ул. Матросова 6/1, тел. +996 (779) 37 72 73.' },
  { group: 'Общее', key: 'forest_design', label: 'Лесной дизайн главного сайта: зелёная полоса сверху, зелёные кнопки и заголовки, тёмно-зелёный подвал (снимите галочку — вернутся прежние цвета)', type: 'checkbox', default: '1' },
  { group: 'Общее', key: 'mohawk_catalogs', label: 'Каталоги в дизайне по образцу mohawkflooring.com: адреса разделов через запятую (linoleum, vinyl, carpet …). Пусто — у всех каталогов прежний вид', default: MOHAWK_ALL },
  { group: 'Общее', key: 'copyright', label: 'Текст в подвале ({year} — текущий год)', default: 'Copyright © {year} ЕвроПол. Все права защищены' },

  // Контакты: адрес, телефон и почта по просьбе владельца от 27.10.2026
  { group: 'Контакты: офис', key: 'phone_main', label: 'Телефон', default: '+996 (779) 37 72 73' },
  { group: 'Контакты: офис', key: 'address', label: 'Адрес', default: 'г. Бишкек, ул. Матросова 6/1' },
  { group: 'Контакты: офис', key: 'work_hours', label: 'Режим работы (пусто — не показывается)', default: 'Пн–Сб с 9.00 до 17.00' },
  { group: 'Контакты: офис', key: 'email', label: 'Email', default: 'info@evropol.kg' },
  { group: 'Контакты: офис', key: 'hours_schema', label: 'Часы работы для Google (Mo-Sa 09:00-17:00; дни: Mo Tu We Th Fr Sa Su)', default: 'Mo-Sa 09:00-17:00' },
  { group: 'Контакты: офис', key: 'geo', label: 'Координаты на карте для Google (широта, долгота)', default: '42.8597994, 74.6189611' },

  { group: 'Контакты: второй адрес', key: 'name_second', label: 'Название (например «Склад» или «Магазин»)', default: '' },
  { group: 'Контакты: второй адрес', key: 'phone_second', label: 'Телефон (если телефон и адрес пустые — второй адрес не показывается)', default: '' },
  { group: 'Контакты: второй адрес', key: 'address_second', label: 'Адрес', default: '' },
  { group: 'Контакты: второй адрес', key: 'work_hours_second', label: 'Режим работы', default: '' },
  { group: 'Контакты: второй адрес', key: 'hours_schema_second', label: 'Часы работы для Google (Mo-Sa 09:00-17:00)', default: '' },
  { group: 'Контакты: второй адрес', key: 'geo_second', label: 'Координаты на карте для Google (широта, долгота)', default: '' },

  { group: 'WhatsApp', key: 'panel_whatsapp', label: 'Номер WhatsApp для зелёной кнопки на сайте и кнопок «Написать в WhatsApp» (пусто — кнопки нет)', default: '+996 (779) 37 72 73' },

  { group: 'Соцсети и карта', key: 'instagram_url', label: 'Instagram', default: 'https://www.instagram.com/evropolkg/' },
  { group: 'Соцсети и карта', key: 'facebook_url', label: 'Facebook', default: '' },
  { group: 'Соцсети и карта', key: 'map_embed_url', label: 'Карта офиса: ссылка для встраивания Google-карты (src из iframe). Пусто — точка по координатам офиса', type: 'textarea',
    default: '' },
  { group: 'Соцсети и карта', key: 'map_embed_url_second', label: 'Карта второго адреса: ссылка для встраивания (пусто — одна карта)', type: 'textarea', default: '' },

  { group: 'Поисковики и аналитика', key: 'google_site_verification', label: 'Google Search Console: код подтверждения (значение content из метатега google-site-verification)', default: '' },
  { group: 'Поисковики и аналитика', key: 'yandex_verification', label: 'Яндекс.Вебмастер: код подтверждения (content из метатега yandex-verification)', default: '' },
  { group: 'Поисковики и аналитика', key: 'ga4_id', label: 'Google Analytics 4: идентификатор потока (G-XXXXXXXXXX). Выводится, если включены счётчики', default: '' },

  { group: 'Счётчики и виджеты', key: 'counters_enabled', label: 'Выводить код счётчиков на сайте', type: 'checkbox', default: '0' },
  { group: 'Счётчики и виджеты', key: 'head_code', label: 'Код в <head> (Яндекс.Метрика, Google Analytics и т.п.)', type: 'code', default: '' },
  { group: 'Счётчики и виджеты', key: 'body_code', label: 'Код в конце <body> (чаты, пиксели)', type: 'code', default: '' },
] as const;

export type SettingKey = (typeof SETTINGS_SCHEMA)[number]['key'];
export type Settings = Record<SettingKey, string>;

export async function getSettings(): Promise<Settings> {
  const rows = await sql<{ key: string; value: string }[]>`SELECT key, value FROM settings`;
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const result = {} as Settings;
  for (const s of SETTINGS_SCHEMA) result[s.key] = stored.get(s.key) ?? s.default;
  return result;
}

/**
 * Настройки для сайта раздела: если у раздела свой адрес (sections.site_address), он заменяет адрес офиса,
 * а координаты и второй адрес офиса не показываются — они относятся к другому месту.
 */
export function siteSettings(settings: Settings, site: { siteAddress: string }): Settings {
  if (!site.siteAddress) return settings;
  // Адрес раздела совпадает с адресом офиса (линолеум и офис на Матросова 6/1): координаты офиса подходят
  const geo = site.siteAddress.trim() === settings.address.trim() ? settings.geo : '';
  return { ...settings, address: site.siteAddress, geo, name_second: '', phone_second: '', address_second: '', work_hours_second: '', geo_second: '' };
}

// Прежняя карта по умолчанию: поиск по адресу. Google мог поставить точку не на том доме, поэтому такую ссылку
// заменяем картой по координатам офиса (поле geo)
const ADDRESS_MAP = 'https://maps.google.com/maps?q=%D0%91%D0%B8%D1%88%D0%BA%D0%B5%D0%BA%2C%20%D1%83%D0%BB.%20%D0%9C%D0%B0%D1%82%D1%80%D0%BE%D1%81%D0%BE%D0%B2%D0%B0%206%2F1&z=16&output=embed';

/** «42.8597994, 74.6189611» → «42.8597994,74.6189611»; неверный ввод → '' */
function latLng(geo: string): string {
  const m = geo.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  return m ? `${m[1]},${m[2]}` : '';
}

export interface OfficeMap {
  /** Адрес для iframe (загружается, когда карта подходит к экрану) */
  src: string;
  name: string;
  address: string;
  /** Ссылка «Открыть в Google Картах» */
  link: string;
}

/**
 * Google-карты офиса и второго адреса с точкой. Своя ссылка из админки («Соцсети и карта») главнее;
 * без неё точка ставится по координатам (geo), без координат — поиском по адресу.
 */
export function officeMaps(settings: Settings): OfficeMap[] {
  const one = (custom: string, geo: string, name: string, address: string): OfficeMap | undefined => {
    const point = latLng(geo);
    const query = encodeURIComponent(point || address);
    const link = `https://www.google.com/maps/search/?api=1&query=${query}`;
    if (custom.startsWith('https://') && custom !== ADDRESS_MAP) return { src: custom, name, address, link };
    if (!point && !address) return undefined;
    return { src: `https://maps.google.com/maps?q=${query}&hl=ru&z=17&output=embed`, name, address, link };
  };
  const office = one(settings.map_embed_url, settings.geo, settings.site_name, settings.address);
  // Второй адрес — только если для него задана своя карта (как раньше)
  const second = settings.map_embed_url_second.startsWith('https://')
    ? one(settings.map_embed_url_second, settings.geo_second, settings.name_second || 'Второй адрес', settings.address_second)
    : undefined;
  return [office, second].filter((m): m is OfficeMap => !!m);
}

export async function saveSettings(values: Partial<Settings>): Promise<void> {
  const rows = Object.entries(values).map(([key, value]) => ({ key, value: value ?? '' }));
  if (!rows.length) return;
  await sql`
    INSERT INTO settings ${sql(rows, 'key', 'value')}
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Ключи настроек, которые можно вставлять в текст страниц как {{phone_main}}. */
export const PLACEHOLDER_KEYS = [
  'phone_main', 'address', 'work_hours', 'email',
  'name_second', 'phone_second', 'address_second', 'work_hours_second',
  'panel_whatsapp', 'site_name',
] as const satisfies readonly SettingKey[];

/**
 * Подставляет в HTML значения настроек: {{phone_main}} → «+996 (779) 37 72 73».
 * Благодаря этому контакты в текстах страниц меняются в одном месте — в «Настройках сайта».
 */
export function fillPlaceholders(html: string, settings: Settings): string {
  const allowed = new Set<string>(PLACEHOLDER_KEYS);
  // В ссылке tel: только цифры и «+»: «tel:{{phone_main}}» → «tel:+996779377273»,
  // в ссылке WhatsApp только цифры: «https://wa.me/{{panel_whatsapp}}» → «https://wa.me/996779377273»
  return html.replace(/(tel:|https:\/\/wa\.me\/)?\{\{\s*([a-z_]+)\s*\}\}/g, (match, link: string | undefined, key: string) => {
    if (!allowed.has(key)) return match;
    const value = settings[key as SettingKey] ?? '';
    if (link === 'tel:') return 'tel:' + value.replace(/[^\d+]/g, '');
    if (link) return link + value.replace(/\D/g, '');
    return escapeHtml(value);
  });
}

/** Каталог раздела в дизайне по образцу mohawkflooring.com (настройка «mohawk_catalogs»: linoleum, vinyl …) */
export function isMohawkCatalog(settings: Settings, slug: string | undefined): boolean {
  if (!slug) return false;
  return (settings.mohawk_catalogs ?? '').split(/[\s,;]+/).map((x) => x.trim().replace(/^\/+/, '')).includes(slug);
}

/**
 * Один раз при запуске (владелец, 09.11.2026: «давай остальные разделы в таком же стиле»): дизайн Mohawk у всех
 * каталогов. Меняется только прежнее значение «linoleum»: свой список, сохранённый в админке, остаётся.
 */
export async function upgradeMohawkAll(): Promise<boolean> {
  const FLAG = 'mohawk_all_2026_11_09';
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return false;
  const updated = await sql`UPDATE settings SET value = ${MOHAWK_ALL} WHERE key = 'mohawk_catalogs' AND trim(value) = 'linoleum'`;
  await sql`INSERT INTO settings (key, value) VALUES (${FLAG}, '1') ON CONFLICT (key) DO NOTHING`;
  return updated.count > 0;
}

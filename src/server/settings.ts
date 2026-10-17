import { sql } from './db.ts';

/** Все настройки сайта с подписями для админки и значениями по умолчанию. */
export const SETTINGS_SCHEMA = [
  { group: 'Общее', key: 'site_name', label: 'Название компании (в заголовках страниц и разметке для Google)', default: 'Европроект' },
  { group: 'Общее', key: 'seo_title', label: 'Заголовок главной страницы (title)', default: 'Европроект: винил, ковровая плитка, коммерческий линолеум в Бишкеке' },
  { group: 'Общее', key: 'seo_description', label: 'Описание главной для поисковиков (meta description)', type: 'textarea',
    default: 'Европроект поставляет в Кыргызстан напольные покрытия Moduleo, BerryAlloc, Modulyss, Betap, IVC Commercial, BLOQ и клеи Forbo Eurocol: винил, ковровую плитку, коммерческий линолеум, террасную доску. Бишкек, ул. Токтогула 125/1, БЦ «Авангард».' },
  { group: 'Общее', key: 'copyright', label: 'Текст в подвале ({year} — текущий год)', default: '© {year} Европроект' },

  // Контакты со старого сайта europroject.kg (17.10.2026)
  { group: 'Контакты: офис', key: 'phone_main', label: 'Телефон', default: '+996 770 55 77 15' },
  { group: 'Контакты: офис', key: 'address', label: 'Адрес', default: 'г. Бишкек, ул. Токтогула 125/1, БЦ «Авангард», Tower B, офис 212' },
  { group: 'Контакты: офис', key: 'work_hours', label: 'Режим работы (пусто — не показывается)', default: '' },
  { group: 'Контакты: офис', key: 'email', label: 'Email', default: 'info@europroject.kg' },
  { group: 'Контакты: офис', key: 'hours_schema', label: 'Часы работы для Google (Mo-Sa 09:00-17:00; дни: Mo Tu We Th Fr Sa Su)', default: '' },
  { group: 'Контакты: офис', key: 'geo', label: 'Координаты на карте для Google (широта, долгота)', default: '' },

  { group: 'Контакты: второй адрес', key: 'name_second', label: 'Название (например «Склад» или «Магазин»)', default: '' },
  { group: 'Контакты: второй адрес', key: 'phone_second', label: 'Телефон (если телефон и адрес пустые — второй адрес не показывается)', default: '' },
  { group: 'Контакты: второй адрес', key: 'address_second', label: 'Адрес', default: '' },
  { group: 'Контакты: второй адрес', key: 'work_hours_second', label: 'Режим работы', default: '' },
  { group: 'Контакты: второй адрес', key: 'hours_schema_second', label: 'Часы работы для Google (Mo-Sa 09:00-17:00)', default: '' },
  { group: 'Контакты: второй адрес', key: 'geo_second', label: 'Координаты на карте для Google (широта, долгота)', default: '' },

  { group: 'WhatsApp', key: 'panel_whatsapp', label: 'Номер WhatsApp для зелёной кнопки на сайте и кнопок «Написать в WhatsApp» (пусто — кнопки нет)', default: '+996 770 55 77 15' },

  { group: 'Соцсети и карта', key: 'instagram_url', label: 'Instagram', default: 'https://www.instagram.com/europroject.kg/' },
  { group: 'Соцсети и карта', key: 'facebook_url', label: 'Facebook', default: '' },
  { group: 'Соцсети и карта', key: 'map_embed_url', label: 'Карта офиса: ссылка для встраивания Google-карты (src из iframe)', type: 'textarea',
    default: 'https://maps.google.com/maps?q=%D0%91%D0%B8%D1%88%D0%BA%D0%B5%D0%BA%2C%20%D1%83%D0%BB.%20%D0%A2%D0%BE%D0%BA%D1%82%D0%BE%D0%B3%D1%83%D0%BB%D0%B0%20125%2F1%2C%20%D0%91%D0%A6%20%D0%90%D0%B2%D0%B0%D0%BD%D0%B3%D0%B0%D1%80%D0%B4&z=16&output=embed' },
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
 * Подставляет в HTML значения настроек: {{phone_main}} → «+996 770 55 77 15».
 * Благодаря этому контакты в текстах страниц меняются в одном месте — в «Настройках сайта».
 */
export function fillPlaceholders(html: string, settings: Settings): string {
  const allowed = new Set<string>(PLACEHOLDER_KEYS);
  return html.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) =>
    allowed.has(key) ? escapeHtml(settings[key as SettingKey] ?? '') : match,
  );
}

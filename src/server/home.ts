// Контент главной страницы. Хранится одним JSON в таблице settings (ключ home_content),
// редактируется в админке: «Главная страница». Карточки разделов и логотипы брендов берутся из «Разделов» и «Брендов».
import { sql } from './db.ts';

export type HomeContent = {
  hero: { title: string; text: string; button: string; link: string; images: string[] };
  about: { title: string; text: string; linkText: string; link: string };
  sections: { title: string; text: string };
  brands: { title: string; text: string };
  news: { title: string; count: number };
  contact: { title: string; text: string };
};

export const HERO_SLOTS = 3;

export const DEFAULT_HOME: HomeContent = {
  hero: {
    title: 'Напольные покрытия\nдля офисов, магазинов и домов',
    text: 'Винил, ковровая плитка, коммерческий линолеум, террасная доска и клеи от европейских производителей.',
    button: 'Разделы',
    link: '#razdely',
    images: [],
  },
  about: {
    // По тексту старой страницы «О компании» (europroject.kg/o-kompanii.html)
    title: 'Европроект',
    text:
      '<p>Мы поставляем в Кыргызстан напольные покрытия Moduleo, BerryAlloc, Modulyss, Betap, IVC Commercial, BLOQ ' +
      'и клеи Forbo Eurocol. Подбираем покрытие под объект: офис, магазин, гостиницу, школу, квартиру.</p>' +
      '<p>Офис: {{address}}. Телефон и WhatsApp: {{phone_main}}.</p>',
    linkText: 'О компании',
    link: '/about',
  },
  sections: {
    title: 'Разделы',
    text: 'У каждого раздела свой сайт с коллекциями, ценами и заказом.',
  },
  brands: {
    title: 'Производители',
    text: '',
  },
  news: { title: 'Новости и события', count: 3 },
  contact: {
    title: 'Свяжитесь с нами',
    text: 'Позвоните или напишите в WhatsApp: подскажем, какое покрытие подойдёт, и пришлём образцы.',
  },
};

const KEY = 'home_content';

/** Контент главной: сохранённый JSON поверх значений по умолчанию (по блокам). */
export async function getHome(): Promise<HomeContent> {
  const [row] = await sql<{ value: string }[]>`SELECT value FROM settings WHERE key = ${KEY}`;
  const home = structuredClone(DEFAULT_HOME);
  if (!row?.value) return home;
  try {
    const saved = JSON.parse(row.value) as Partial<HomeContent>;
    for (const k of Object.keys(home) as (keyof HomeContent)[]) {
      if (saved[k]) Object.assign(home[k], saved[k]);
    }
    return home;
  } catch {
    return home;
  }
}

export async function saveHome(content: HomeContent): Promise<void> {
  const value = JSON.stringify(content);
  await sql`INSERT INTO settings (key, value) VALUES (${KEY}, ${value})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

/** Все пути картинок, на которые ссылается контент (чтобы удалять ненужные файлы). */
export function homeImages(c: HomeContent): string[] {
  return c.hero.images.filter(Boolean);
}

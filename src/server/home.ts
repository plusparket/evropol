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
    text: 'Линолеум, ковролин, ковровая плитка, кварцвинил SPC и LVT, ламинат от европейских производителей.',
    button: 'Разделы',
    link: '#razdely',
    images: [],
  },
  // Блоки «О компании», «Разделы» и «Производители» на старом europroject.kg на главной не было: заголовки пустые,
  // блоки скрыты. Чтобы показать блок, достаточно вписать заголовок в админке.
  about: {
    // По тексту старой страницы «О компании» (europroject.kg/o-kompanii.html)
    title: '',
    text:
      '<p>Мы поставляем в Кыргызстан напольные покрытия IVC Commercial, Moduleo, BerryAlloc, Modulyss, Betap и BLOQ. ' +
      'Подбираем покрытие под объект: офис, магазин, гостиницу, школу, квартиру.</p>' +
      '<p>Офис: {{address}}. Телефон и WhatsApp: {{phone_main}}.</p>',
    linkText: 'О компании',
    link: '/about',
  },
  sections: {
    title: '',
    text: 'У каждого раздела свой сайт с коллекциями, ценами и заказом.',
  },
  brands: {
    title: '',
    text: '',
  },
  // Как на старом europroject.kg
  news: { title: 'Новости', count: 3 },
  contact: {
    title: 'Наши контакты',
    text: 'У вас есть вопросы о нашем сайте, продуктах или услугах?',
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

// Значения по умолчанию первой версии сайта (до 23.10.2026). Если владелец их не менял, upgradeHome() ставит
// новые, как на старом europroject.kg. Изменённое в админке не трогается.
const OLD_DEFAULTS = {
  about: 'Европроект',
  sections: 'Разделы',
  brands: 'Производители',
  news: 'Новости и события',
  contactTitle: 'Свяжитесь с нами',
  contactText: 'Позвоните или напишите в WhatsApp: подскажем, какое покрытие подойдёт, и пришлём образцы.',
};
const LAYOUT_KEY = 'home_layout';

/** Один раз переводит сохранённую главную на вид старого europroject.kg. Возвращает true, если что-то поменялось. */
export async function upgradeHome(): Promise<boolean> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${LAYOUT_KEY} AND value = '2'`;
  if (done) return false;
  const [row] = await sql<{ value: string }[]>`SELECT value FROM settings WHERE key = ${KEY}`;
  let changed = false;
  if (row?.value) {
    const home = await getHome();
    const swap = (cur: string, old: string, next: string) => {
      if (cur !== old) return cur;
      changed = true;
      return next;
    };
    home.about.title = swap(home.about.title, OLD_DEFAULTS.about, DEFAULT_HOME.about.title);
    home.sections.title = swap(home.sections.title, OLD_DEFAULTS.sections, DEFAULT_HOME.sections.title);
    home.brands.title = swap(home.brands.title, OLD_DEFAULTS.brands, DEFAULT_HOME.brands.title);
    home.news.title = swap(home.news.title, OLD_DEFAULTS.news, DEFAULT_HOME.news.title);
    home.contact.title = swap(home.contact.title, OLD_DEFAULTS.contactTitle, DEFAULT_HOME.contact.title);
    home.contact.text = swap(home.contact.text, OLD_DEFAULTS.contactText, DEFAULT_HOME.contact.text);
    if (changed) await saveHome(home);
  }
  const copyright = await sql`UPDATE settings SET value = 'Copyright © {year} Европроект. Все права защищены'
                              WHERE key = 'copyright' AND value = '© {year} Европроект'`;
  await sql`INSERT INTO settings (key, value) VALUES (${LAYOUT_KEY}, '2') ON CONFLICT (key) DO UPDATE SET value = '2'`;
  return changed || copyright.count > 0;
}

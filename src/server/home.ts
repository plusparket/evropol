// Контент главной страницы. Хранится одним JSON в таблице settings (ключ home_content),
// редактируется в админке: «Главная страница». Карточки разделов и логотипы брендов берутся из «Разделов» и «Брендов».
import { sql } from './db.ts';

export type HomeContent = {
  hero: {
    title: string; text: string; button: string; link: string; images: string[];
    /** Слайды с фото разделов (public/img/home/banner) вместо загруженных фото; загруженные фото сохраняются */
    sectionSlides: boolean;
  };
  about: { title: string; text: string; linkText: string; link: string };
  sections: { title: string; text: string };
  brands: { title: string; text: string };
  news: { title: string; count: number };
  contact: { title: string; text: string };
  /** Приветствие под главным экраном (по образцу berryalloc.com, 10.11.2026) */
  welcome: { title: string; text: string };
  /** Плитки разделов: заголовок блока, подпись кнопки, краткое описание раздела по его slug */
  catalog: { title: string; button: string; texts: Record<string, string>; /** slug разделов без плитки на главной */ hidden: string[] };
  /** Блок консультации с кнопкой WhatsApp (пустая ссылка — WhatsApp из настроек, без номера — страница контактов) */
  consult: { title: string; text: string; button: string; link: string };
};

export const HERO_SLOTS = 3;

export const DEFAULT_HOME: HomeContent = {
  hero: {
    title: 'Напольные покрытия\nдля офисов, магазинов и домов',
    text: 'Линолеум, ковролин, ковровая плитка, кварцвинил SPC и LVT, ламинат, паркет, клеи и строительные смеси.',
    button: 'Разделы',
    link: '#razdely',
    images: [],
    sectionSlides: true,
  },
  // Блоки «О компании», «Разделы» и «Производители» на старом europroject.kg на главной не было: заголовки пустые,
  // блоки скрыты. Чтобы показать блок, достаточно вписать заголовок в админке.
  about: {
    // По тексту страницы «О компании» (06.11.2026)
    title: '',
    text:
      '<p>ЕвроПол работает на рынке напольных покрытий Кыргызстана с 2000 года и везёт товар напрямую с заводов в Европе. ' +
      'Подбираем покрытие под объект: квартиру, офис, магазин, гостиницу, школу.</p>' +
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
  // Главная по образцу berryalloc.com/en (владелец, 10.11.2026). Заголовки приветствия и консультации — слова владельца
  // (приветствие с «салон напольных покрытий в Бишкеке» и вторая фраза текста — владелец, 11.11.2026, для поиска Google),
  // остальное переведено и написано по скиллу stop-slop, без брендов.
  welcome: {
    title: 'Добро пожаловать в ЕвроПол — салон напольных покрытий в Бишкеке! Здесь Вы найдете пол Вашей мечты!',
    text:
      'В нашем каталоге линолеум, ковролин, ковровая плитка, ламинат, SPC кварц-винил, паркет, паркетная доска, ' +
      'инженерная доска, ёлочка, а также строительная химия и средства по уходу за полами. Современные покрытия из ' +
      'Германии, Бельгии и Нидерландов, изготовленные из прочных материалов, которые прослужат вам очень долго.',
  },
  catalog: {
    title: 'Поиск по продуктам',
    button: 'Смотреть коллекции',
    texts: {
      linoleum:
        'Бытовой и полукоммерческий линолеум толщиной от 1,8 до 4,1 мм, ширина рулона до 4 м. Рисунки под дерево, ' +
        'камень и плитку для квартир, офисов и магазинов.',
      carpet:
        'Ковровое покрытие в рулонах шириной от 2 до 5 м. Тёплый мягкий пол для спальни, гостиной, гостиничного ' +
        'номера и кабинета.',
      'carpet-tiles':
        'Квадраты 50 × 50 см и полосы 25 × 100 см. Из плиток собирают разные рисунки, а испачканную плитку меняют ' +
        'по одной. Для офисов, гостиниц и школ.',
      vinyl:
        'Кварцвиниловая доска, ёлочка и плитка SPC и LVT. Вода покрытию не вредит, поэтому его кладут на кухне и ' +
        'в прихожей.',
      laminate:
        'Ламинат толщиной 7, 8 и 12 мм с классами износостойкости от AC3 до AC6. Доска и ёлочка с рисунком дуба ' +
        'для квартир и офисов.',
      parquet:
        'Паркет и паркетная доска из натурального дерева, инженерная доска и ёлочка. Каталог открывается на сайте ' +
        'нашего салона паркета.',
      adhesives:
        'Клеи, грунтовки, наливные полы и лаки для укладки линолеума, ковролина, плитки и паркета.',
    },
    // Владелец 10.11.2026: седьмая плитка стоит одна в ряду, «Строительная химия» остаётся в меню, подвале и каталоге
    hidden: ['adhesives'],
  },
  consult: {
    title: 'Не знаете, какое покрытие выбрать? Получите профессиональную консультацию прямо сейчас!',
    text:
      'Мы знаем: ассортимент напольных покрытий очень широк и у каждого свои цвета, фактуры и рисунки.\n' +
      'Подобрать покрытие под ваш интерьер непросто, но мы Вам с этим поможем.',
    button: 'Связаться с нами',
    link: '',
  },
};

const KEY = 'home_content';
/** Приветствие до 11.11.2026: сохранённое без правок меняется на новое (владелец, для поиска Google) */
const OLD_WELCOME_TITLE = 'Добро пожаловать в ЕвроПол! Здесь Вы найдете пол Вашей мечты!';
const OLD_WELCOME_TEXT =
  'В нашем каталоге линолеум, ковролин, ковровая плитка, ламинат, SPC кварц-винил, паркет, паркетная доска, ' +
  'инженерная доска, ёлочка, а также строительная химия и средства по уходу за полами. Покрытия сделаны из прочных ' +
  'материалов, служат долго и выглядят современно.';
const OLD_CONSULT_TEXT =
  'Мы знаем: вариантов много, у каждого свои цвета, фактуры и рисунки.\nПодобрать покрытие под ваш интерьер непросто, и мы с этим поможем.';

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
    // Первый текст консультации (10.11.2026) владелец заменил своим: сохранённый без правок меняем на новый
    if (home.consult.text === OLD_CONSULT_TEXT) home.consult.text = DEFAULT_HOME.consult.text;
    if (home.welcome.title === OLD_WELCOME_TITLE) home.welcome.title = DEFAULT_HOME.welcome.title;
    if (home.welcome.text === OLD_WELCOME_TEXT) home.welcome.text = DEFAULT_HOME.welcome.text;
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
/** Фото плиток разделов на главной: public/img/home/<slug>.webp, из каталогов (без водяных знаков и логотипов) */
/** Слайды баннера по разделам (владелец, 10.11.2026): public/img/home/banner/<slug>.webp (1920 px) и -800/-1400.webp,
 *  фото в интерьере из каталогов, «Паркет» с domparketa.kg. У «Строительной химии» крупного фото в интерьере нет. */
export const HOME_BANNER: Record<string, number> = {
  linoleum: 1920, carpet: 1706, 'carpet-tiles': 1422, vinyl: 1600, laminate: 1920, parquet: 1920,
};

export const HOME_TILE_IMAGES = ['linoleum', 'carpet', 'carpet-tiles', 'vinyl', 'laminate', 'parquet', 'adhesives'];

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
  const copyright = await sql`UPDATE settings SET value = 'Copyright © {year} ЕвроПол. Все права защищены'
                              WHERE key = 'copyright' AND value = '© {year} Европроект'`;
  await sql`INSERT INTO settings (key, value) VALUES (${LAYOUT_KEY}, '2') ON CONFLICT (key) DO UPDATE SET value = '2'`;
  return changed || copyright.count > 0;
}

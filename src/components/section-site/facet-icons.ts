// Значки у значений фильтров каталога (CatalogHome.astro): рисунок типа дизайна и образец цвета, 20 × 20 px.
// Файлы — public/img/facets/. Значение без значка показывается просто текстом.
const ICONS: Record<string, string> = {
  'Тип дизайна:Абстракция': 'design-abstraktsiya.png',
  'Тип дизайна:Дерево': 'design-derevo.png',
  'Тип дизайна:Камень': 'design-kamen.png',
  'Тип дизайна:Плитка': 'design-plitka.png',
  'Тип дизайна:Узор': 'design-uzor.png',
  'Цвет:Бежевый': 'color-bezhevyy.png',
  'Цвет:Белый': 'color-belyy.png',
  'Цвет:Голубой': 'color-goluboy.png',
  'Цвет:Жёлтый': 'color-zheltyy.png',
  'Цвет:Зелёный': 'color-zelenyy.png',
  'Цвет:Коричневый': 'color-korichnevyy.png',
  'Цвет:Натуральный': 'color-naturalnyy.png',
  'Цвет:Рыжий': 'color-ryzhiy.png',
  'Цвет:Светло-серый': 'color-svetlo-seryy.png',
  'Цвет:Серо-бежевый': 'color-sero-bezhevyy.png',
  'Цвет:Серый': 'color-seryy.png',
  'Цвет:Тёмно-серый': 'color-temno-seryy.png',
  'Цвет:Чёрный': 'color-chernyy.png',
};

/** Адрес значка для «Цвет» + «Серый» или пусто */
export const facetIcon = (label: string, value: string) => (ICONS[`${label}:${value}`] ? `/img/facets/${ICONS[`${label}:${value}`]}` : '');

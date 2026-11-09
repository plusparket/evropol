// Сайт раздела: фильтры каталога применяются сразу при выборе, расчёт упаковок на странице товара.
// Обработчики через делегирование: страницы меняет ClientRouter без перезагрузки.

// Фильтры: форма GET, отправляем при каждом изменении галочки
// (сортировка в каталоге по образцу Mohawk стоит вне формы и привязана к ней атрибутом form)
document.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  const form = input.form ?? input.closest<HTMLFormElement>('form');
  if (form?.matches('[data-filters]')) form.requestSubmit();
});

// Каталог по образцу Mohawk (MhCatalog.astro): кнопки, образцы цветов, форма WhatsApp в подвале
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;

  // «Раскрыть все фильтры» / «Свернуть все фильтры»
  const expand = target.closest<HTMLButtonElement>('[data-mh-expand]');
  if (expand) {
    const open = expand.getAttribute('aria-expanded') !== 'true';
    expand.setAttribute('aria-expanded', String(open));
    expand.closest('form')?.querySelectorAll<HTMLDetailsElement>('details').forEach((d) => (d.open = open));
    return;
  }

  // «Фильтр» на телефоне открывает и закрывает панель фильтров
  const toggle = target.closest<HTMLElement>('[data-mh-filters-toggle]');
  if (toggle) {
    document.querySelector('.mhcat-body')?.classList.toggle('mh-filters-open');
    return;
  }

  // Образец цвета: меняет фото, цвет и ссылки карточки
  const sw = target.closest<HTMLButtonElement>('.mhc-sw-item');
  if (sw) {
    const card = sw.closest<HTMLElement>('[data-mhc]');
    if (!card) return;
    card.querySelectorAll('.mhc-sw-item').forEach((b) => {
      b.classList.toggle('active', b === sw);
      b.setAttribute('aria-pressed', String(b === sw));
    });
    const { href = '', img = '', name = '', wa = '' } = sw.dataset;
    card.querySelectorAll<HTMLAnchorElement>('[data-mhc-link]').forEach((a) => (a.href = href));
    const pic = card.querySelector<HTMLImageElement>('[data-mhc-img]');
    if (pic && img) pic.src = img;
    const label = card.querySelector('[data-mhc-name]');
    if (label) label.textContent = name;
    const waLink = card.querySelector<HTMLAnchorElement>('[data-mhc-wa]');
    if (waLink && wa) waLink.href = wa;
    return;
  }

  // Стрелки у ряда образцов: прокрутка на три образца
  const nav = target.closest<HTMLButtonElement>('.mhc-nav');
  if (nav) {
    const list = nav.parentElement?.querySelector<HTMLElement>('[data-sw-list]');
    const item = list?.querySelector<HTMLElement>('li');
    if (list && item) list.scrollBy({ left: Number(nav.dataset.sw) * (item.offsetWidth + 12) * 3, behavior: 'smooth' });
  }
});

// Стрелки неактивны у начала и конца ряда образцов
document.addEventListener(
  'scroll',
  (e) => {
    const list = e.target as HTMLElement;
    if (!(list instanceof HTMLElement) || !list.matches('[data-sw-list]')) return;
    const box = list.parentElement!;
    box.querySelector<HTMLButtonElement>('.mhc-nav--prev')!.disabled = list.scrollLeft <= 1;
    box.querySelector<HTMLButtonElement>('.mhc-nav--next')!.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 1;
  },
  true,
);

// Форма в подвале: имя и вопрос уходят в WhatsApp одним сообщением
document.addEventListener('submit', (e) => {
  const form = e.target as HTMLFormElement;
  if (!form.matches('[data-wa-form]')) return;
  e.preventDefault();
  const data = new FormData(form);
  const name = String(data.get('name') ?? '').trim();
  const text = String(data.get('text') ?? '').trim();
  const message = ['Здравствуйте!', name && `Меня зовут ${name}.`, text].filter(Boolean).join(' ');
  window.open(`${form.action}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
});

// На телефоне фильтры свёрнуты, пока ни один не выбран (без скрипта — всегда раскрыты)
document.addEventListener('astro:page-load', () => {
  const box = document.querySelector<HTMLDetailsElement>('[data-filters-box]');
  if (box && window.matchMedia('(max-width: 860px)').matches && !box.querySelector('input:checked')) box.open = false;
});

// На компьютере колёсико над фильтрами прокручивает только фильтры, даже когда они уже в конце или помещаются целиком:
// страница с товарами стоит на месте. Над товарами колёсико прокручивает страницу, фильтры при этом закреплены.
document.addEventListener(
  'wheel',
  (e) => {
    const box = (e.target as Element).closest?.<HTMLElement>('[data-filters-box]');
    if (!box || e.ctrlKey || !window.matchMedia('(min-width: 861px)').matches) return;
    e.preventDefault();
    const step = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? box.clientHeight : 1;
    box.scrollTop += e.deltaY * step;
  },
  { passive: false },
);

// Упаковки по площади: площадь × 1,05 (запас на подрезку) / м² в упаковке, вверх до целой.
// Результат попадает в текст сообщения WhatsApp.
const RESERVE = 1.05;
document.addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement;
  const calc = input.closest<HTMLElement>('[data-calc]');
  if (!calc) return;
  const pack = Number(calc.dataset.pack);
  const area = Number(input.value.replace(',', '.'));
  const out = calc.querySelector('[data-calc-out]');
  const wa = document.querySelector<HTMLAnchorElement>('[data-wa]');
  if (!out || !pack) return;
  if (!(area > 0)) {
    out.textContent = `В упаковке ${pack.toLocaleString('ru-RU')} м². Укажите площадь, и мы посчитаем упаковки с запасом 5% на подрезку.`;
    if (wa) wa.href = `https://wa.me/${wa.dataset.waNumber}?text=${encodeURIComponent(wa.dataset.waText ?? '')}`;
    return;
  }
  const packs = Math.ceil((area * RESERVE) / pack);
  const total = Math.round(packs * pack * 100) / 100;
  const word = packs % 10 === 1 && packs % 100 !== 11 ? 'упаковка' : packs % 10 >= 2 && packs % 10 <= 4 && (packs % 100 < 10 || packs % 100 >= 20) ? 'упаковки' : 'упаковок';
  out.textContent = `${packs} ${word}, ${total.toLocaleString('ru-RU')} м² (с запасом 5%).`;
  if (wa) {
    const text = `${wa.dataset.waText} Площадь ${area.toLocaleString('ru-RU')} м², по расчёту ${packs} ${word}.`;
    wa.href = `https://wa.me/${wa.dataset.waNumber}?text=${encodeURIComponent(text)}`;
  }
});

// Поведение публичной части: выдвижное меню, кнопка «Наверх», карты, переходы между страницами.
// Переходы между страницами выполняет <ClientRouter />: страница подгружается без полной перезагрузки,
// поэтому обработчики вешаются через делегирование, а инициализация — на событие astro:page-load.
import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);

// --- Боковое меню на телефонах -------------------------------------------------------
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#main-menu')?.classList.contains('ac')) setSidebar(false);
});
function setSidebar(open: boolean): void {
  ['#main-menu', '#burger', '#overlay'].forEach((sel) => $(sel)?.classList.toggle('ac', open));
  document.body.classList.toggle('fixed', open);
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;

  if (target.closest('#burger')) return setSidebar(!$('#main-menu')?.classList.contains('ac'));
  if (target.closest('#overlay, [data-menu-close]')) return setSidebar(false);

  if (target.closest('#to-top')) window.scrollTo({ top: 0, behavior: 'smooth' });
}, true); // capture: раньше обработчика ClientRouter

// --- Кнопка «Наверх»: видна, когда страница прокручена ---------------------------------
function onScroll(): void {
  $('#to-top')?.classList.toggle('visible', window.scrollY > 400);
}
window.addEventListener('scroll', onScroll, { passive: true });

// --- Переходы между страницами --------------------------------------------------------
let firstLoad = true;

// Карты Google в подвале тяжёлые (сотни КБ скриптов) — грузим, только когда подвал подходит к экрану
let mapObserver: IntersectionObserver | undefined;
function observeMaps(): void {
  mapObserver?.disconnect();
  const frames = [...document.querySelectorAll<HTMLIFrameElement>('iframe[data-src]')];
  if (!frames.length) return;
  mapObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const frame = e.target as HTMLIFrameElement;
        mapObserver?.unobserve(frame);
        if (!frame.dataset.src) continue; // уже загружена
        frame.src = frame.dataset.src;
        frame.removeAttribute('data-src');
      }
    },
    { rootMargin: '300px 0px' },
  );
  frames.forEach((f) => mapObserver!.observe(f));
}

document.addEventListener('astro:before-preparation', () => $('#loading')?.classList.add('ac'));

// Переходы идут без перезагрузки, поэтому после обновления сайта открытая вкладка продолжает выполнять старые
// скрипты, а с новой страницей подключились бы ещё и новые — всё срабатывало бы дважды (слайдер, карты).
// Если номер сборки у новой страницы другой — отменяем мягкий переход: роутер откроет страницу полной загрузкой.
document.addEventListener('astro:before-preparation', (e) => {
  const ev = e as TransitionBeforePreparationEvent;
  const load = ev.loader;
  ev.loader = async () => {
    await load();
    const build = ev.newDocument?.querySelector('meta[name="build"]')?.getAttribute('content');
    if (build && build !== __BUILD_ID__) ev.preventDefault();
  };
});
document.addEventListener('astro:after-swap', () => {
  $('#loading')?.classList.remove('ac');
  document.body.classList.remove('fixed');
});

document.addEventListener('astro:page-load', () => {
  onScroll();
  observeMaps();

  // Счётчик Яндекс.Метрики (старый API): засчитываем просмотр при переходе без перезагрузки
  if (!firstLoad) {
    for (const key of Object.keys(window)) {
      const counter = (window as unknown as Record<string, { hit?: (url: string, opts?: object) => void }>)[key];
      if (key.startsWith('yaCounter') && typeof counter?.hit === 'function') {
        counter.hit(location.href, { title: document.title, referer: document.referrer });
      }
    }
  }
  firstLoad = false;
});

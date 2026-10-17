// Поведение оформления: компактная шапка при прокрутке, выдвижное меню, слайдер главного экрана,
// фото новостей крупно.
// Всё инициализируется на astro:page-load и работает только если нужные элементы есть на странице.

const timers: number[] = [];

// Подразделы в выдвижном меню
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const sub = target.closest<HTMLElement>('[data-drawer-sub]');
  if (sub) sub.closest('.pdrawer-item')?.classList.toggle('open');
});

// Компактная шапка: меньше логотип, без адресов. Возвращается у самого верха страницы (разные пороги,
// чтобы шапка не дёргалась: она становится ниже, и страница сдвигается на эту разницу)
function onScroll(): void {
  const ph = document.getElementById('ph');
  if (!ph) return;
  const y = window.scrollY;
  if (y > 60) ph.classList.add('ph--compact');
  else if (y < 10) ph.classList.remove('ph--compact');
}
window.addEventListener('scroll', onScroll, { passive: true });

// Слайдер главного экрана: плавная смена фото
function initHero(): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const slides = [...hero.querySelectorAll<HTMLElement>('.phero-slide')];
  const dots = [...hero.querySelectorAll<HTMLElement>('[data-hero-dot]')];
  if (slides.length < 2) return;
  // Фото 2, 3… приходят без src (data-src), чтобы не мешать загрузке первого экрана
  const load = (slide: HTMLElement) => {
    const img = slide.querySelector<HTMLImageElement>('img[data-src]');
    if (!img) return;
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src!;
    img.removeAttribute('data-src');
  };
  const loadRest = () => timers.push(window.setTimeout(() => slides.forEach(load), 1500));
  if (document.readyState === 'complete') loadRest();
  else window.addEventListener('load', loadRest, { once: true });
  let current = 0;
  const show = (i: number) => {
    current = (i + slides.length) % slides.length;
    load(slides[current]);
    slides.forEach((s, k) => s.classList.toggle('active', k === current));
    dots.forEach((d, k) => d.classList.toggle('active', k === current));
  };
  let timer = window.setInterval(() => show(current + 1), 6000);
  timers.push(timer);
  const restart = () => {
    window.clearInterval(timer);
    timer = window.setInterval(() => show(current + 1), 6000);
    timers.push(timer);
  };
  hero.querySelector('[data-hero-prev]')?.addEventListener('click', () => { show(current - 1); restart(); });
  hero.querySelector('[data-hero-next]')?.addEventListener('click', () => { show(current + 1); restart(); });
  dots.forEach((d) => d.addEventListener('click', () => { show(Number(d.dataset.heroDot)); restart(); }));
  // Свайп на телефонах
  let startX: number | null = null;
  hero.addEventListener('pointerdown', (e) => (startX = e.clientX));
  hero.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) { show(current + (dx < 0 ? 1 : -1)); restart(); }
  });
}

// Фото новости крупно: окно поверх страницы, стрелки и клавиши ← →, закрытие — крестик, Esc или нажатие на фон
function openLightbox(links: HTMLAnchorElement[], start: number): void {
  let i = start;
  const box = document.createElement('dialog');
  box.className = 'plightbox';
  box.innerHTML = `<img alt="" /><button type="button" class="plightbox-close" aria-label="Закрыть">✕</button>` +
    (links.length > 1
      ? `<button type="button" class="plightbox-prev" aria-label="Предыдущее фото">‹</button>` +
        `<button type="button" class="plightbox-next" aria-label="Следующее фото">›</button><div class="plightbox-count"></div>`
      : '');
  const img = box.querySelector('img')!;
  const show = (n: number) => {
    i = (n + links.length) % links.length;
    img.src = links[i].href;
    const count = box.querySelector('.plightbox-count');
    if (count) count.textContent = `${i + 1} / ${links.length}`;
  };
  box.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('.plightbox-prev')) show(i - 1);
    else if (t.closest('.plightbox-next')) show(i + 1);
    else if (t === box || t.closest('.plightbox-close')) box.close();
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
  box.addEventListener('close', () => box.remove());
  document.body.append(box);
  show(start);
  box.showModal();
}
document.addEventListener('click', (e) => {
  const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-lightbox]');
  if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault();
  const links = [...(link.parentElement?.querySelectorAll<HTMLAnchorElement>('[data-lightbox]') ?? [link])];
  openLightbox(links, links.indexOf(link));
}, true); // раньше обработчика ClientRouter, который иначе откроет фото как страницу

document.addEventListener('astro:page-load', () => {
  onScroll();
  initHero();
});

document.addEventListener('astro:before-swap', () => {
  timers.splice(0).forEach((t) => { window.clearInterval(t); window.clearTimeout(t); });
});

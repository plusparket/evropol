// Сайт раздела: фильтры каталога применяются сразу при выборе, расчёт упаковок на странице товара.
// Обработчики через делегирование: страницы меняет ClientRouter без перезагрузки.

// Фильтры: форма GET, отправляем при каждом изменении галочки
document.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  const form = input.closest<HTMLFormElement>('form[data-filters]');
  if (form) form.requestSubmit();
});

// На телефоне фильтры свёрнуты, пока ни один не выбран (без скрипта — всегда раскрыты)
document.addEventListener('astro:page-load', () => {
  const box = document.querySelector<HTMLDetailsElement>('[data-filters-box]');
  if (box && window.matchMedia('(max-width: 860px)').matches && !box.querySelector('input:checked')) box.open = false;
});

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

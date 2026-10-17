// Скрипты панели управления. Все формы работают и без них; скрипты добавляют удобства.

// Меню на узких экранах
document.getElementById('adm-burger')?.addEventListener('click', () => {
  document.getElementById('adm-side')?.classList.toggle('open');
});

// Подтверждение опасных действий: <button data-confirm="Удалить?">
document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-confirm]');
  if (el && !window.confirm(el.dataset.confirm || 'Вы уверены?')) e.preventDefault();
});

// Автозаполнение адреса из названия, пока адрес не меняли вручную
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
const slugify = (s: string) =>
  s.toLowerCase().split('').map((c) => TRANSLIT[c] ?? c).join('')
    .replace(/[^a-z0-9_-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');

document.querySelectorAll<HTMLInputElement>('input[data-slug-from]').forEach((slug) => {
  const source = document.querySelector<HTMLInputElement>(`[name="${slug.dataset.slugFrom}"]`);
  if (!source) return;
  let touched = slug.value !== '';
  slug.addEventListener('input', () => (touched = true));
  source.addEventListener('input', () => {
    if (!touched) slug.value = slugify(source.value);
  });
});

// Редактор списков «характеристика — значение»
document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-row-action]');
  if (!btn) return;
  e.preventDefault();
  const action = btn.dataset.rowAction;
  if (action === 'add') {
    const list = document.getElementById(btn.dataset.target!);
    const tpl = document.getElementById(`${btn.dataset.target}-tpl`) as HTMLTemplateElement | null;
    if (list && tpl) {
      list.append(tpl.content.cloneNode(true));
      list.lastElementChild?.querySelector('input')?.focus();
    }
    return;
  }
  const row = btn.closest('.row-item');
  if (!row) return;
  if (action === 'remove') row.remove();
  if (action === 'up' && row.previousElementSibling) row.parentElement!.insertBefore(row, row.previousElementSibling);
  if (action === 'down' && row.nextElementSibling) row.parentElement!.insertBefore(row.nextElementSibling, row);
});

// Предпросмотр выбранной картинки
document.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  if (input.type !== 'file' || !input.dataset.preview) return;
  const img = document.getElementById(input.dataset.preview) as HTMLImageElement | null;
  const file = input.files?.[0];
  if (img && file) {
    img.src = URL.createObjectURL(file);
    img.hidden = false;
  }
});

// Визуальный редактор подгружается только на страницах, где он нужен
if (document.querySelector('textarea[data-editor]')) {
  import('./editor.ts').then((m) => m.initEditors());
}

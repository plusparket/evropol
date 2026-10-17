const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ң: 'n', ө: 'o', ү: 'u',
};

/** «Лаковые покрытия» → «lakovye-pokrytiya». Используется для подсказки адреса в админке. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export const isValidSlug = (s: string) => /^[a-z0-9][a-z0-9_-]*$/.test(s);

// --- Разбор полей формы -----------------------------------------------------------

export const str = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
export const strs = (form: FormData, name: string) => form.getAll(name).map((v) => String(v));
export const bool = (form: FormData, name: string) => form.has(name) && form.get(name) !== '0';
export function int(form: FormData, name: string, fallback = 0): number {
  const n = Number.parseInt(str(form, name), 10);
  return Number.isFinite(n) ? n : fallback;
}
export function intOrNull(form: FormData, name: string): number | null {
  const n = Number.parseInt(str(form, name), 10);
  return Number.isFinite(n) ? n : null;
}

export function toInt(value: string | undefined | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 && n < 2 ** 31 ? n : null;
}

/** Текст без HTML-тегов (для meta description). */
export function plainText(html: string, max = 200): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Значение для <input type="datetime-local"> */
export function toDatetimeLocal(d: Date | string): string {
  const date = new Date(d);
  const off = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - off).toISOString().slice(0, 16);
}

export function pluralRu(n: number, forms: [string, string, string]): string {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}

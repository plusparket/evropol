// Общие функции страниц панели управления.

const MESSAGES: Record<string, string> = {
  saved: 'Изменения сохранены',
  created: 'Запись создана',
  deleted: 'Запись удалена',
  uploaded: 'Файлы загружены',
  password: 'Пароль изменён',
};

/** Сообщение после перенаправления: /admin/...?ok=saved или ?err=текст */
export function flash(url: URL): { ok?: string; err?: string } {
  const ok = url.searchParams.get('ok');
  const err = url.searchParams.get('err');
  return { ok: ok ? (MESSAGES[ok] ?? ok) : undefined, err: err ?? undefined };
}

export function withFlash(path: string, key: 'ok' | 'err', value: string): string {
  const u = new URL(path, 'http://x');
  u.searchParams.set(key, value);
  return u.pathname + u.search;
}

/** Код ошибки Postgres → понятный текст. */
export function dbErrorMessage(err: unknown): string {
  const e = err as { code?: string; constraint_name?: string; message?: string };
  if (e?.code === '23505') return 'Такой адрес (или логин) уже занят — укажите другой';
  if (e?.code === '23503') return 'Нельзя удалить: запись используется';
  if (e?.code === '23514') return 'Недопустимое значение поля';
  return e?.message ?? 'Неизвестная ошибка';
}

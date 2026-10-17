// Посты из Instagram компании → новости (таблица news, source = 'instagram').
//
// Работает через официальный Instagram API (вход через Instagram, аккаунт «Профессиональный»).
// Ключ доступа (long-lived access token, живёт 60 дней) берётся из INSTAGRAM_TOKEN в .env; при каждой
// синхронизации ключ продлевается, новый хранится в таблице settings (instagram_token).
// Раз в две недели синхронизация запускается сама (scheduleInstagramSync, scripts/start.ts); в новостях остаются
// KEEP_POSTS самых новых постов Instagram, более старые удаляются вместе с фото.
// вручную: node scripts/instagram-sync.ts. Подробнее — docs/news-instagram.md.
import { sql } from './db.ts';
import { removeUploads, saveImage } from './uploads.ts';
import { uniqueNewsSlug } from './content.ts';

const API = 'https://graph.instagram.com';
const DAY = 24 * 3600_000;
const SYNC_EVERY = 14 * DAY;
/** Сколько самых новых постов Instagram держать в новостях. */
export const KEEP_POSTS = 24;
const TOKEN_KEY = 'instagram_token';
const SYNCED_KEY = 'instagram_synced_at';

/**
 * Названия, которые владелец запретил писать на сайте (AGENTS.md). Пост с ними попадает в новости скрытым:
 * его можно поправить и опубликовать в админке. Пока запретов нет.
 */
const BANNED: RegExp[] = [];

type Media = { id: string; media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'; media_url?: string; thumbnail_url?: string };
type Post = Media & { caption?: string; permalink: string; timestamp: string; children?: { data: Media[] } };

export type SyncResult = { added: number; hidden: number; skipped: number; removed: number };

async function setting(key: string): Promise<string> {
  const [row] = await sql<{ value: string }[]>`SELECT value FROM settings WHERE key = ${key}`;
  return row?.value ?? '';
}
async function setSetting(key: string, value: string): Promise<void> {
  await sql`INSERT INTO settings (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

/** Ключ доступа: продлённый (из базы) или исходный из .env. */
async function getToken(): Promise<string> {
  const token = (await setting(TOKEN_KEY)) || process.env.INSTAGRAM_TOKEN || '';
  if (!token) throw new Error('Нет ключа доступа Instagram: впишите INSTAGRAM_TOKEN в .env (см. docs/news-instagram.md)');
  return token;
}

async function api<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message: string } };
  if (!res.ok || body.error) throw new Error(`Instagram API: ${body.error?.message ?? res.status}`);
  return body;
}

/** Продлевает ключ ещё на 60 дней (Instagram разрешает, если ключу больше суток). */
async function refreshToken(token: string, log: (m: string) => void): Promise<string> {
  try {
    const r = await api<{ access_token: string }>(`${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
    await setSetting(TOKEN_KEY, r.access_token);
    return r.access_token;
  } catch (err) {
    log(`ключ не продлён: ${(err as Error).message}`);
    return token;
  }
}

/** Посты новее даты since (новые первыми). */
async function fetchPosts(token: string, since: Date): Promise<Post[]> {
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}';
  let url: string | undefined = `${API}/me/media?fields=${fields}&limit=50&access_token=${encodeURIComponent(token)}`;
  const out: Post[] = [];
  while (url) {
    const page: { data: Post[]; paging?: { next?: string } } = await api(url);
    for (const p of page.data) {
      if (new Date(p.timestamp) < since) return out;
      out.push(p);
    }
    url = page.paging?.next;
  }
  return out;
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Подпись поста без хэштегов: строки, состоящие только из #тегов, убираются, теги в конце строк — тоже. */
export function cleanCaption(caption = ''): string {
  return caption
    .split('\n')
    .map((l) => l.replace(/(\s*#[\p{L}\p{N}_]+)+\s*$/u, '').trimEnd())
    .filter((l) => !/^\s*(#[\p{L}\p{N}_]+\s*)+$/u.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Заголовок записи — первая строка подписи (до 90 знаков, по границе слова). */
export function titleFrom(text: string, date: Date): string {
  const first = text.split('\n').find((l) => l.trim())?.trim() ?? '';
  const sentence = first.split(/(?<=[.!?])\s/)[0];
  const t = sentence.length > 90 ? sentence.slice(0, 90).replace(/\s+\S*$/, '') + '…' : sentence;
  return t || `Пост от ${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

async function download(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const [rel] = await saveImage(Buffer.from(await res.arrayBuffer()), 'content');
    return rel;
  } catch {
    return null;
  }
}

/** Загружает посты Instagram за последние `days` дней, которых ещё нет в новостях. */
export async function syncInstagram(days = 90, log: (m: string) => void = console.log): Promise<SyncResult> {
  const token = await refreshToken(await getToken(), log);
  // Только KEEP_POSTS самых новых: более старые всё равно удалятся при очистке
  const posts = (await fetchPosts(token, new Date(Date.now() - days * DAY))).slice(0, KEEP_POSTS);
  const known = new Set(
    (await sql<{ sourceId: string }[]>`SELECT source_id FROM news WHERE source = 'instagram'`).map((r) => r.sourceId),
  );
  const result: SyncResult = { added: 0, hidden: 0, skipped: 0, removed: 0 };

  // Старые первыми — чтобы номера записей шли по порядку публикации
  for (const p of posts.reverse()) {
    if (known.has(p.id)) { result.skipped++; continue; }
    const media = p.media_type === 'CAROUSEL_ALBUM' ? (p.children?.data ?? []) : [p];
    const images: string[] = [];
    for (const m of media) {
      const src = m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url;
      const rel = src && (await download(src));
      if (rel) images.push(rel);
    }
    const date = new Date(p.timestamp);
    const text = cleanCaption(p.caption);
    const paragraphs = text.split(/\n\s*\n/).map((b) => `<p>${escapeHtml(b).replace(/\n/g, '<br>')}</p>`);
    const gallery = images.map((rel) => `<p><img src="/uploads/${rel}" alt="" loading="lazy"></p>`);
    const banned = BANNED.some((re) => re.test(text));
    const title = titleFrom(text, date);
    await sql`
      INSERT INTO news ${sql({
        title,
        // Адрес записи — из названия (транслит); английский можно вписать в админке
        slug: await uniqueNewsSlug(title),
        excerpt: text.replace(/\s+/g, ' ').slice(0, 220),
        content: [...paragraphs, ...gallery].join('\n'),
        publishedAt: date,
        isPublished: !banned,
        image: images[0] ?? '',
        source: 'instagram',
        sourceId: p.id,
        sourceUrl: p.permalink,
      })}
      ON CONFLICT DO NOTHING`;
    result.added++;
    if (banned) {
      result.hidden++;
      log(`скрыт (запрещённое название): ${p.permalink}`);
    }
  }
  result.removed = await pruneInstagram();
  await setSetting(SYNCED_KEY, new Date().toISOString());
  log(`Instagram: новых записей ${result.added} (скрыто ${result.hidden}), уже были ${result.skipped}, удалено старых ${result.removed}`);
  return result;
}

/**
 * Удаляет посты Instagram старше KEEP_POSTS самых новых (скрытые тоже считаются) вместе с их фото.
 * Записи, добавленные в админке, не трогает. Возвращает число удалённых записей.
 */
export async function pruneInstagram(): Promise<number> {
  const old = await sql<{ image: string; content: string }[]>`
    DELETE FROM news WHERE id IN (
      SELECT id FROM news WHERE source = 'instagram' ORDER BY published_at DESC, id DESC OFFSET ${KEEP_POSTS}
    ) RETURNING image, content`;
  for (const n of old) {
    const files = [...n.content.matchAll(/src="\/uploads\/([^"]+)"/g)].map((m) => m[1]);
    await removeUploads(n.image, ...files);
  }
  return old.length;
}

/**
 * Синхронизация раз в две недели внутри работающего сайта: раз в 6 часов проверяет, прошло ли 14 дней
 * с прошлой загрузки, и забирает посты за последние 30 дней (с запасом, повторы пропускаются).
 */
export function scheduleInstagramSync(log: (m: string) => void = (m) => console.log(`[instagram] ${m}`)): void {
  const tick = async () => {
    try {
      if (!(await setting(TOKEN_KEY)) && !process.env.INSTAGRAM_TOKEN) return;
      const last = Date.parse(await setting(SYNCED_KEY)) || 0;
      if (Date.now() - last >= SYNC_EVERY) await syncInstagram(30, log);
    } catch (err) {
      log(`ошибка: ${(err as Error).message}`);
    }
  };
  setTimeout(tick, 60_000);
  setInterval(tick, 6 * 3600_000).unref();
}

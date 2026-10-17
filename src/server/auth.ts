import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { AstroCookies } from 'astro';
import { sql } from './db.ts';

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

export const SESSION_COOKIE = 'dp_session';
const SESSION_DAYS = 30;
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export type SessionUser = { id: number; login: string; name: string };

// --- Пароли (scrypt из стандартной библиотеки Node) ----------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, hashB64] = stored.split('$');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// --- Сессии -------------------------------------------------------------------

const tokenId = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(userId: number, cookies: AstroCookies, secure: boolean): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (${tokenId(token)}, ${userId}, ${expires})`;
  await sql`UPDATE users SET last_login_at = now() WHERE id = ${userId}`;
  await sql`DELETE FROM sessions WHERE expires_at < now()`;
  cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', secure, expires });
}

export async function getSessionUser(cookies: AstroCookies): Promise<SessionUser | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [user] = await sql<SessionUser[]>`
    SELECT u.id, u.login, u.name
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ${tokenId(token)} AND s.expires_at > now() AND u.is_active`;
  return user ?? null;
}

export async function destroySession(cookies: AstroCookies): Promise<void> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await sql`DELETE FROM sessions WHERE id = ${tokenId(token)}`;
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function authenticate(login: string, password: string): Promise<SessionUser | null> {
  const [row] = await sql<(SessionUser & { passwordHash: string })[]>`
    SELECT id, login, name, password_hash FROM users WHERE login = ${login} AND is_active`;
  if (!row) {
    await hashPassword(password); // выравниваем время ответа
    return null;
  }
  if (!(await verifyPassword(password, row.passwordHash))) return null;
  return { id: row.id, login: row.login, name: row.name };
}

// --- Ограничение попыток входа (в памяти процесса) ------------------------------

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const LOCK_MS = 15 * 60_000;

export function isLoginLocked(key: string): boolean {
  const a = attempts.get(key);
  return !!a && a.count >= MAX_ATTEMPTS && a.until > Date.now();
}

export function registerLoginFailure(key: string): void {
  const a = attempts.get(key);
  if (!a || a.until < Date.now()) attempts.set(key, { count: 1, until: Date.now() + LOCK_MS });
  else a.count++;
}

export function resetLoginFailures(key: string): void {
  attempts.delete(key);
}

/** Создаёт первого администратора из ADMIN_LOGIN/ADMIN_PASSWORD, если пользователей ещё нет. */
export async function ensureAdmin(log: (msg: string) => void = console.log): Promise<void> {
  const [{ count }] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM users`;
  if (count > 0) return;
  const login = process.env.ADMIN_LOGIN || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    log('ВНИМАНИЕ: пользователей нет и ADMIN_PASSWORD не задан — войти в админку будет нельзя. Выполните npm run create-admin.');
    return;
  }
  await sql`INSERT INTO users (login, name, password_hash) VALUES (${login}, 'Администратор', ${await hashPassword(password)})`;
  log(`создан администратор «${login}»`);
}

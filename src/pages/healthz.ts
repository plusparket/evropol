import type { APIRoute } from 'astro';
import { sql } from '../server/db.ts';

// Проверка живости для Docker HEALTHCHECK: приложение отвечает и база доступна.
export const GET: APIRoute = async () => {
  try {
    await sql`SELECT 1`;
    return new Response('ok', { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return new Response('db unavailable', { status: 503 });
  }
};

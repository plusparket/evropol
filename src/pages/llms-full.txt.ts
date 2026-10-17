// /llms-full.txt — всё содержимое сайта для ИИ-ассистентов: каждый товар, страницы, акции, контакты.
// Собирается из базы — см. src/server/llms.ts и AGENTS.md.
import type { APIRoute } from 'astro';
import { buildLlmsFullTxt } from '../server/llms.ts';

export const GET: APIRoute = async ({ url }) =>
  new Response(await buildLlmsFullTxt(url.origin), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });

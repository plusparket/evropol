// /llms.txt — обзор сайта для ИИ-ассистентов (https://llmstxt.org). Собирается из базы — см. src/server/llms.ts и AGENTS.md.
import type { APIRoute } from 'astro';
import { buildLlmsTxt } from '../server/llms.ts';

export const GET: APIRoute = async ({ url }) =>
  new Response(await buildLlmsTxt(url.origin), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });

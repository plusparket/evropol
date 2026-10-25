// /llms.txt сайта раздела (vinyl.localhost/llms.txt): раздел, контакты, каталог. Собирается из базы — src/server/llms.ts.
import type { APIRoute } from 'astro';
import { buildSiteLlmsTxt } from '../../server/llms.ts';

export const GET: APIRoute = async ({ locals }) =>
  locals.site
    ? new Response(await buildSiteLlmsTxt(locals.site), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
      })
    : new Response('Not found', { status: 404 });

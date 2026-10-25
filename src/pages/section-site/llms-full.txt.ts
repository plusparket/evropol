// /llms-full.txt сайта раздела: всё содержимое, с описаниями и характеристиками товаров. См. src/server/llms.ts.
import type { APIRoute } from 'astro';
import { buildSiteLlmsFullTxt } from '../../server/llms.ts';

export const GET: APIRoute = async ({ locals }) =>
  locals.site
    ? new Response(await buildSiteLlmsFullTxt(locals.site), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
      })
    : new Response('Not found', { status: 404 });

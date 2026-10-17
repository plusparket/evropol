import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ url }) => {
  const base = (process.env.SITE_URL || url.origin).replace(/\/$/, '');
  const body = ['User-agent: *', 'Disallow: /admin', '', `Sitemap: ${base}/sitemap.xml`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

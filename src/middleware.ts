import { defineMiddleware } from 'astro:middleware';
import { getSessionUser } from './server/auth.ts';
import { trackVisit } from './server/content.ts';
import { getSectionByHost, getSectionBySlug, mainDomain, normalizeHost, siteUrl } from './server/sections.ts';

const VISIT_COOKIE = 'ep_visit';
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|wget|python|headless/i;
/** Страницы сайтов разделов: src/pages/section-site/. Снаружи этот адрес не открывается */
const SECTION_SITE = '/section-site';
/** Общие файлы: одни и те же на главном сайте и на сайтах разделов */
const SHARED_RE = /^\/(uploads|_astro|_image|img|fonts)\/|^\/(favicon[^/]*|apple-touch-icon\.png|healthz)$/;

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  ctx.locals.user = null;
  ctx.locals.site = null;

  // --- Один адрес сайта: www.evropol.kg → evropol.kg (иначе в Google два адреса — дубли) -----
  const host = ctx.request.headers.get('host') ?? '';
  if (host.startsWith('www.') && !process.env.SITE_URL?.includes('://www.')) {
    const base = process.env.SITE_URL || `${ctx.url.protocol}//${host.slice(4)}`;
    return Response.redirect(new URL(pathname + ctx.url.search, base), 301);
  }

  // --- Сайт раздела (vinyl.localhost …): тот же код, страницы из src/pages/section-site --------------
  const site = host && !SHARED_RE.test(pathname) ? await getSectionByHost(host) : undefined;
  if (site) {
    ctx.locals.site = site;
    // Админка одна на все сайты — на главном
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      const main = process.env.SITE_URL || `${ctx.url.protocol}//localhost`;
      return Response.redirect(new URL(pathname + ctx.url.search, main), 302);
    }
    trackPageView(ctx, pathname);
    return next(new URL(SECTION_SITE + (pathname === '/' ? '' : pathname) + ctx.url.search, ctx.url));
  }
  // Раздел переехал с поддомена на свой домен (laminate.evropol.kg → laminate.kg): старый адрес ведёт на новый (301),
  // чтобы Google перенёс страницы, а не показывал на поддомене главный сайт
  const domain = mainDomain();
  const h = normalizeHost(host);
  if (domain && h.endsWith(`.${domain}`) && !h.startsWith('www.')) {
    const moved = await getSectionBySlug(h.slice(0, -domain.length - 1));
    if (moved?.siteHost) return Response.redirect(siteUrl(moved) + pathname + ctx.url.search, 301);
  }
  if (pathname === SECTION_SITE || pathname.startsWith(SECTION_SITE + '/')) return new Response('Not found', { status: 404 });

  // --- Панель управления: только для авторизованных -----------------------------
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    ctx.locals.user = await getSessionUser(ctx.cookies);
    if (!ctx.locals.user && pathname !== '/admin/login') {
      return ctx.redirect(`/admin/login?next=${encodeURIComponent(pathname + ctx.url.search)}`);
    }
    const res = await next();
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  trackPageView(ctx, pathname);
  return next();
});

/** Простая статистика посещений публичных страниц (обзор в админке) */
function trackPageView(ctx: Parameters<Parameters<typeof defineMiddleware>[0]>[0], pathname: string): void {
  const isPageView =
    ctx.request.method === 'GET' &&
    !pathname.startsWith('/partials/') &&
    !pathname.startsWith('/uploads/') &&
    !pathname.startsWith('/_') &&
    !/\.[a-z0-9]{2,5}$/i.test(pathname) &&
    pathname !== '/healthz' &&
    !BOT_RE.test(ctx.request.headers.get('user-agent') ?? '');

  if (isPageView) {
    const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD по часовому поясу сервера (TZ)
    const isNewVisitor = ctx.cookies.get(VISIT_COOKIE)?.value !== today;
    if (isNewVisitor) {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      ctx.cookies.set(VISIT_COOKIE, today, { path: '/', expires: endOfDay, sameSite: 'lax', httpOnly: true });
    }
    trackVisit(isNewVisitor).catch((err) => console.error('trackVisit', err));
  }
}

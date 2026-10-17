import { defineMiddleware } from 'astro:middleware';
import { getSessionUser } from './server/auth.ts';
import { trackVisit } from './server/content.ts';

const VISIT_COOKIE = 'ep_visit';
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|wget|python|headless/i;

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  ctx.locals.user = null;

  // --- Один адрес сайта: www.europroject.kg → europroject.kg (иначе в Google два адреса — дубли) -----
  const host = ctx.request.headers.get('host') ?? '';
  if (host.startsWith('www.') && !process.env.SITE_URL?.includes('://www.')) {
    const base = process.env.SITE_URL || `${ctx.url.protocol}//${host.slice(4)}`;
    return Response.redirect(new URL(pathname + ctx.url.search, base), 301);
  }

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

  // --- Публичные страницы: простая статистика посещений ---------------------------
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

  return next();
});

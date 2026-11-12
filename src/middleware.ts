import { defineMiddleware } from 'astro:middleware';
import { getSessionUser } from './server/auth.ts';
import { RESERVED_SLUGS, trackVisit } from './server/content.ts';
import { catalogPath, getSectionByHost, getSectionBySlug, mainDomain, mainUrl, normalizeHost, type Section } from './server/sections.ts';

const VISIT_COOKIE = 'ep_visit';
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|wget|python|headless/i;
/** Страницы каталогов разделов: src/pages/section-site/. Снаружи этот адрес не открывается */
const SECTION_SITE = '/section-site';
/** Общие файлы: на старых адресах сайтов разделов отдаются как есть (фото в старых ссылках не ломаются) */
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

  // --- Старые сайты разделов (linoleum.localhost, linoleum.evropol.kg, свой домен раздела) ---------------------
  // С 08.11.2026 каталог раздела — страница главного сайта (/linoleum). Старый адрес ведёт на неё постоянной
  // переадресацией (301): ссылки и закладки работают, Google переносит страницы на главный сайт.
  if (host && !SHARED_RE.test(pathname)) {
    const old = await oldSectionSite(host);
    if (old) {
      const main = mainUrl();
      const target =
        pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/sitemap.xml' || pathname === '/robots.txt'
          ? pathname
          : catalogPath(old, pathname.replace(/\/+$/, ''));
      return Response.redirect(main + target + ctx.url.search, 301);
    }
  }

  // --- Каталог раздела: /linoleum, /linoleum/<товар>, /linoleum/<категория> ----------------------------------
  // Тот же код, что был у сайтов разделов: страницы из src/pages/section-site/, раздел — в locals.site
  if (pathname === SECTION_SITE || pathname.startsWith(SECTION_SITE + '/')) return new Response('Not found', { status: 404 });
  const m = pathname.match(/^\/([a-z0-9_-]+)(\/.*)?$/i);
  if (m && !RESERVED_SLUGS.has(m[1])) {
    const site = await getSectionBySlug(m[1]);
    if (site?.siteHost) {
      const rest = (m[2] ?? '').replace(/\/+$/, '');
      // Один адрес у страницы: /linoleum/ → /linoleum, /linoleum/x/ → /linoleum/x
      if (m[1] !== site.slug || pathname !== catalogPath(site, rest)) return ctx.redirect(catalogPath(site, rest) + ctx.url.search, 301);
      ctx.locals.site = site;
      trackPageView(ctx, pathname);
      return next(new URL(SECTION_SITE + rest + ctx.url.search, ctx.url));
    }
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

/**
 * Раздел, чей старый сайт открыли: адрес из «site_host» (linoleum.localhost, свой домен) или поддомен главного
 * сайта с адресом раздела (linoleum.evropol.kg). Главный сайт и www сюда не попадают.
 */
async function oldSectionSite(host: string): Promise<Section | undefined> {
  const h = normalizeHost(host);
  if (h === normalizeHost(mainUrl()) || h.startsWith('www.')) return undefined;
  const byHost = await getSectionByHost(h);
  if (byHost) return byHost;
  const domain = mainDomain();
  if (!domain || !h.endsWith(`.${domain}`)) return undefined;
  const s = await getSectionBySlug(h.slice(0, -domain.length - 1));
  return s?.siteHost ? s : undefined;
}

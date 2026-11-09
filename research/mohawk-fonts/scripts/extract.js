(() => {
  const props = ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textTransform','color'];
  const cs = el => { const s = getComputedStyle(el); const o = {}; props.forEach(p => o[p] = s[p]); return o; };
  const txt = el => (el.innerText || el.value || el.placeholder || '').trim().replace(/\s+/g,' ').slice(0,60);
  const desc = el => el.tagName.toLowerCase() + (el.id ? '#'+el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0,3).join('.') : '');
  const pick = (sel, n=3) => {
    let els = [];
    try { els = [...document.querySelectorAll(sel)]; } catch(e) { return []; }
    els = els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const seen = new Set(); const out = [];
    for (const el of els) {
      const s = cs(el); const key = JSON.stringify(s);
      if (seen.has(key)) continue; seen.add(key);
      out.push({ el: desc(el), text: txt(el), ...s });
      if (out.length >= n) break;
    }
    return out;
  };
  const r = {};
  r.url = location.href; r.title = document.title; r.viewport = innerWidth;
  r.body = [{ el:'body', ...cs(document.body) }];
  r.html = [{ el:'html', ...cs(document.documentElement) }];
  ['h1','h2','h3','h4','h5','h6'].forEach(h => r[h] = pick(h, 4));
  r.headerNav = pick('header nav a, header nav button, header [role=menuitem], header li > a, [class*="nav" i] > ul > li > a, [class*="megamenu" i] a, [class*="Header" i] a', 8);
  r.headerAll = pick('header a, header button, header span, header p', 10);
  r.buttons = pick('button, a[class*="btn" i], a[class*="button" i], [role=button], input[type=submit]', 10);
  r.breadcrumbs = pick('[class*="breadcrumb" i] a, [class*="breadcrumb" i] li, [class*="breadcrumb" i] span, nav[aria-label*="bread" i] *', 5);
  r.filterHeadings = pick('[class*="filter" i] h2, [class*="filter" i] h3, [class*="filter" i] h4, [class*="filter" i] button, [class*="facet" i] button, [class*="facet" i] h3, [class*="refine" i] button, [class*="accordion" i] button, aside button, aside h3, aside h4', 8);
  r.filterOptions = pick('[class*="filter" i] label, [class*="facet" i] label, [class*="filter" i] li, [class*="facet" i] li, aside label, aside li, [class*="filter" i] span, [class*="facet" i] span', 10);
  r.resultCount = pick('[class*="count" i], [class*="result" i], [class*="total" i]', 6);
  r.productCardTitle = pick('[class*="product" i] [class*="name" i], [class*="product" i] [class*="title" i], [class*="card" i] [class*="title" i], [class*="tile" i] [class*="name" i], [class*="product" i] h2, [class*="product" i] h3, [class*="card" i] h3', 6);
  r.productCardSub = pick('[class*="product" i] [class*="color" i], [class*="product" i] [class*="colour" i], [class*="product" i] [class*="price" i], [class*="product" i] [class*="sub" i], [class*="product" i] [class*="brand" i], [class*="product" i] [class*="collection" i], [class*="card" i] p, [class*="tile" i] p, [class*="product" i] p, [class*="product" i] span', 10);
  r.pagination = pick('[class*="paginat" i] a, [class*="paginat" i] button, [class*="paginat" i] span, [class*="pager" i] a, [class*="load-more" i], [class*="loadmore" i]', 6);
  r.footerHeadings = pick('footer h2, footer h3, footer h4, footer h5, footer h6, footer strong, footer [class*="title" i], footer [class*="heading" i]', 6);
  r.footerLinks = pick('footer a', 6);
  r.footerText = pick('footer p, footer span, footer small', 6);
  r.smallText = pick('small, [class*="small" i], [class*="caption" i], [class*="disclaimer" i], [class*="legal" i]', 6);
  r.inputs = pick('input, select, textarea', 6);
  r.links = pick('main a, a', 6);
  r.paragraphs = pick('main p, p', 6);
  // font usage frequency across visible elements
  const freq = {};
  document.querySelectorAll('body *').forEach(el => {
    if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    const s = getComputedStyle(el); const k = s.fontFamily + ' | ' + s.fontWeight + ' | ' + s.fontSize;
    freq[k] = (freq[k] || 0) + 1;
  });
  r.fontUsage = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,40).map(([k,v]) => ({ key:k, count:v }));
  r.documentFonts = [...document.fonts].map(f => ({ family:f.family, weight:f.weight, style:f.style, status:f.status }));
  const ff = []; const sheetErrors = [];
  const walk = (rules, href) => { for (const rule of rules) {
    if (rule.type === 5) ff.push({ family: rule.style.getPropertyValue('font-family'), weight: rule.style.getPropertyValue('font-weight'), style: rule.style.getPropertyValue('font-style'), display: rule.style.getPropertyValue('font-display'), src: rule.style.getPropertyValue('src'), sheet: href });
    else if (rule.cssRules) walk(rule.cssRules, href);
  } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules, sh.href || 'inline'); } catch(e) { sheetErrors.push({ href: sh.href, err: String(e) }); } }
  r.fontFaces = ff; r.crossOriginSheets = sheetErrors;
  r.stylesheets = [...document.styleSheets].map(s => s.href).filter(Boolean);
  r.rootVars = (() => { const o = {}; for (const sh of document.styleSheets) { try { for (const rule of sh.cssRules) { if (rule.selectorText === ':root') { for (const p of rule.style) if (p.startsWith('--')) o[p] = rule.style.getPropertyValue(p).trim(); } } } catch(e){} } return o; })();
  return JSON.stringify(r, null, 2);
})()

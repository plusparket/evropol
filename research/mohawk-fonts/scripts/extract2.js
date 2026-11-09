(async () => {
  const props = ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textTransform','color'];
  const cs = el => { const s = getComputedStyle(el); const o = {}; props.forEach(p => o[p] = s[p]); return o; };
  const desc = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).filter(c => !c.startsWith('ng-')).slice(0,3).join('.') : '');
  const ownText = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim().replace(/\s+/g,' ');
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const leaves = () => [...document.querySelectorAll('body *')].filter(el => ownText(el) && !['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName));
  const byText = (re, n = 2, scope) => {
    const out = []; const seen = new Set();
    for (const el of leaves()) {
      if (scope && !el.closest(scope)) continue;
      const t = ownText(el); if (!re.test(t)) continue;
      const s = cs(el); const k = JSON.stringify(s); if (seen.has(k)) continue; seen.add(k);
      out.push({ el: desc(el), text: t.slice(0,60), visible: visible(el), ...s });
      if (out.length >= n) break;
    }
    return out;
  };
  const r = {};
  r.headerNavTop = byText(/^(Shop|Explore|Plan & Install|Cleaning & Care)$/, 2, 'header, [class*="header" i], nav');
  r.headerSearch = byText(/^Search$/, 2);
  r.breadcrumbHome = byText(/^Home$/, 2);
  r.breadcrumbCurrent = byText(/^Resilient$/, 2);
  r.findRetailer = byText(/^Find a Local Retailer$/, 1);
  r.filterBy = byText(/^Filter By$/, 1);
  r.filterChip = byText(/^Resilient \/ Vinyl$/, 2);
  r.clearAll = byText(/^Clear All$/i, 1);
  r.expandAll = byText(/^Expand All Filters$/i, 1);
  r.filterGroupTitles = byText(/^(Flooring Type|Look|Color|Product Line|Feature|Room)$/, 3);
  r.resultCount = byText(/^\d+ Results?$/, 1);
  r.sort = byText(/^(A-Z|Z-A|Sort.*|Featured|Newest)$/i, 3);
  r.cardCollection = byText(/^(PureTech Plus|Mohawk Sheet Vinyl|SolidTech.*|RevWood.*|Mohawk.*)$/, 2, '.plp-product__collection, [class*="product" i]');
  r.cardProductLine = byText(/\|/, 4, '.plp-product__collection, [class*="product" i]');
  r.cardColorLabel = byText(/^Color\s*:?$/, 2, '[class*="product" i]');
  r.cardColorValue = byText(/^(Umber|Grand Mesa 545|Appaloosa Hickory|Fallen Leaf Oak|:?\s*Umber)$/, 2);
  r.cardColorsCount = byText(/^\d+ colors?\s*\|?$/, 2);
  r.cardRating = byText(/^\d\.\d( \(\d+\))?$|^\(\d+\)$/, 3);
  r.loadMore = byText(/load more|show more|view more|next|previous|^\d+$/i, 4, '[class*="paginat" i], [class*="pager" i], [class*="load" i], [class*="more" i]');
  r.footerTitles = byText(/^[A-Z &]{3,}$/, 4, 'footer, [class*="footer" i]');
  r.footerLinks = byText(/^(Carpet|Hardwood|Laminate|Terms & Conditions|Privacy.*)$/, 3, 'footer, [class*="footer" i]');
  r.footerSmall = byText(/©|copyright|rights reserved/i, 2);
  r.newsletter = byText(/SUBSCRIBE|design inspiration/i, 4);
  // expand filters to read option labels
  const btn = [...document.querySelectorAll('button')].find(b => /expand all filters/i.test(b.innerText || ''));
  if (btn) { btn.click(); await new Promise(res => setTimeout(res, 2500)); }
  r.filterOptionLabels = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('mat-expansion-panel label, mat-expansion-panel .mdc-label, mat-expansion-panel li, mat-expansion-panel span, mat-expansion-panel a')) {
    const t = ownText(el); if (!t || !visible(el)) continue;
    const s = cs(el); const k = JSON.stringify(s); if (seen.has(k)) continue; seen.add(k);
    r.filterOptionLabels.push({ el: desc(el), text: t.slice(0,60), ...s });
    if (r.filterOptionLabels.length >= 8) break;
  }
  return JSON.stringify(r, null, 2);
})()

(async () => {
  try { await document.fonts.ready; } catch (e) {}
  const first = ff => (ff || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
  const ownText = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim().replace(/\s+/g, ' ');
  const visible = el => {
    const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false;
    const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity) > 0;
  };
  const sel = el => {
    const parts = []; let e = el;
    for (let i = 0; e && e.nodeType === 1 && i < 4; i++, e = e.parentElement) {
      let p = e.tagName.toLowerCase();
      if (e.id) { p += '#' + e.id; parts.unshift(p); break; }
      if (typeof e.className === 'string' && e.className.trim()) p += '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.');
      parts.unshift(p);
    }
    return parts.join(' > ');
  };
  const formEls = new Set(document.querySelectorAll('button, input, select, textarea'));
  const offenders = []; const families = {}; let checked = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'svg'].includes(el.tagName) || el.closest('svg, iframe')) continue;
    const isForm = formEls.has(el);
    const t = ownText(el);
    if (!t && !isForm) continue;
    if (isForm && el.type === 'hidden') continue;
    const vis = visible(el);
    if (!vis && !isForm) continue;
    checked++;
    const ff = getComputedStyle(el).fontFamily; const f1 = first(ff);
    families[f1] = (families[f1] || 0) + 1;
    let phFF = null;
    if (isForm && el.placeholder) { try { phFF = getComputedStyle(el, '::placeholder').fontFamily; } catch (e) {} }
    const bad = f1.toLowerCase() !== 'nunito' || (phFF && first(phFF).toLowerCase() !== 'nunito');
    if (bad) offenders.push({ selector: sel(el), tag: el.tagName.toLowerCase(), type: el.type || undefined, text: (t || el.value || el.placeholder || el.getAttribute('aria-label') || '').slice(0, 60), placeholder: el.placeholder || undefined, visible: vis, fontFamily: ff, placeholderFontFamily: phFF || undefined });
  }
  const fonts = [...document.fonts].map(f => ({ family: f.family.replace(/^["']|["']$/g, ''), weight: f.weight, style: f.style, status: f.status }));
  return JSON.stringify({
    url: location.href, status: document.title, title: document.title, checkedElements: checked, firstFamilyCounts: families,
    offenders, nonNunitoLoadedFonts: fonts.filter(f => f.status === 'loaded' && f.family.toLowerCase() !== 'nunito'),
    nunitoFonts: fonts.filter(f => f.family.toLowerCase() === 'nunito').map(f => f.weight + ' ' + f.style + ' ' + f.status),
    iframes: [...document.querySelectorAll('iframe')].map(i => i.src).slice(0, 5)
  });
})()

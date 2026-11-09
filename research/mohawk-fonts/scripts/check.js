(async () => {
  await document.fonts.ready;
  const r = { url: location.href, width: innerWidth, title: document.title };
  r.bodyFont = getComputedStyle(document.body).fontFamily;
  r.loadedFonts = [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight + ' ' + f.style))];
  r.nunitoCheck = ['400','600','700'].map(w => ({ w, ok: document.fonts.check(w + ' 16px Nunito') }));
  r.docOverflowX = document.documentElement.scrollWidth - innerWidth;
  const header = document.querySelector('header') || document.querySelector('[class*="header" i]');
  r.header = header ? { tag: header.tagName, cls: header.className, h: Math.round(header.getBoundingClientRect().height), overflowX: header.scrollWidth - header.clientWidth } : null;
  const navLinks = header ? [...header.querySelectorAll('nav a, nav button, nav > ul > li > a, nav li > a')].filter(a => { const b = a.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (a.innerText || '').trim(); }) : [];
  r.navItems = navLinks.map(a => { const b = a.getBoundingClientRect(); const s = getComputedStyle(a); return { text: a.innerText.trim().replace(/\s+/g, ' ').slice(0, 40), top: Math.round(b.top), left: Math.round(b.left), right: Math.round(b.right), h: Math.round(b.height), font: s.fontFamily.split(',')[0] + ' ' + s.fontWeight + ' ' + s.fontSize, wraps: b.height > parseFloat(s.lineHeight || s.fontSize) * 1.6, clipped: a.scrollWidth > a.clientWidth + 1 }; });
  r.navTops = [...new Set(r.navItems.map(i => i.top))];
  const ov = [];
  for (let i = 0; i < navLinks.length; i++) for (let j = i + 1; j < navLinks.length; j++) {
    const a = navLinks[i].getBoundingClientRect(), b = navLinks[j].getBoundingClientRect();
    if (navLinks[i].contains(navLinks[j]) || navLinks[j].contains(navLinks[i])) continue;
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) ov.push([r.navItems[i].text, r.navItems[j].text]);
  }
  r.navOverlaps = ov;
  // elements wider than viewport
  r.wideElements = [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.right > innerWidth + 1 && b.width > 0 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 8).map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ')[0] : '') + ' right=' + Math.round(e.getBoundingClientRect().right));
  r.h1 = [...document.querySelectorAll('h1')].slice(0, 2).map(h => ({ text: h.innerText.trim().slice(0, 60), font: getComputedStyle(h).fontFamily.split(',')[0] + ' ' + getComputedStyle(h).fontWeight + ' ' + getComputedStyle(h).fontSize }));
  return JSON.stringify(r, null, 2);
})()

# Mohawk Flooring typography capture

Source: https://www.mohawkflooring.com/shop/resilient?colorGroup=all&look=all&type=Resilient%20%2F%20Vinyl&page=1
Captured 2026-11-09 with headless Edge over the DevTools protocol (desktop 1440px, mobile 390px).

## Key findings
- The whole UI uses **Nunito** (`font-family: Nunito, Helvetica, sans-serif`; body: `Nunito, "Helvetica Neue", sans-serif`), letter-spacing 0.45px on most text, main text colour #151515.
- Weights loaded on the page: Nunito 300, 400, 600, 700. Many rules ask for 500, but there is no 500 @font-face, so the browser renders those at 400.
- Fonts declared via @font-face (self-hosted at /assets/fonts/...): Nunito 200-900 (.otf), Open Sans 300/400/600/700 (.otf), Gotham 300/500/700 (.otf), Proxima Nova 400 (.woff2), mflooring-icon (icons), swiper-icons. Third-party widgets add Schibsted Grotesk, Lato-AudioEye, site-menu_icons, launcher_icons_v2, opendyslexicregular.

| Element (desktop 1440) | Font / weight / size / line-height | Extra |
|---|---|---|
| body | Nunito 400 16px / normal | #000 |
| Top nav (Shop, Explore...) | Nunito 700 16px / 24px | ls 0.45px, #151515 |
| Breadcrumb link | Nunito 300 12px / 18px | current crumb 700 12px |
| "Find a Local Retailer" | Nunito 700 12px / 18px | |
| Search input | Nunito 600 13px / 18px | |
| "Filter By" | Nunito 500 20px / 30px | mobile 16px / 24px |
| Filter chip | Nunito 600 15px / 22.5px | #54565B |
| "Clear All" | Nunito 700 15px / 16px | #CE0E2D |
| "EXPAND ALL FILTERS" button | Nunito 700 13px / 19.5px uppercase | |
| Filter group title | Nunito 500 16px / 18px | #4A4A4A |
| Filter option label | Nunito 500 16px / 18px (desktop); 400 12px / 20px (mobile) | |
| Result count | Nunito 500 17px / 25.5px | mobile 300 14px / 18px |
| Sort "A-Z" | Nunito 400 17px / 20px | |
| Card title (collection | name) | Nunito 700 16px / 15px | mobile 700 14px |
| Card "Color : X", "N colors" | Nunito 500 14px / 15px | mobile 13px / 11px |
| Card rating | Nunito 400 14px | |
| Footer menu title | Nunito 600 13px / 19.5px | #fff |
| Footer link / copyright | Nunito 300 12px / 15-18px | #fff |
| Newsletter heading | Nunito 600 13px / 19.5px | |
| Subscribe button | Nunito 700 14px / 21px uppercase | |

## Files
- computed-styles-*.json: full extraction (generic selectors, document.fonts, @font-face rules, font usage frequency)
- computed-styles-targeted-*.json: elements matched by visible text
- screenshot-*.png: full-page screenshots (desktop 1440, mobile 390 @2x)
- rendered-dom-*.html: DOM after JS render; raw/page.html + raw/styles-4C37AVXC.css: curl downloads
- scripts/: capture scripts (PowerShell + CDP)
fill150 - raw pages from manufacturers' official sites. index.tsv in each brand folder:
url, file, name, collection, first main photo URL, then any data sheet PDF URLs.

laminate/BerryAlloc: 75 products (all new; ranges Ocean 8 V4 30, Ocean 8 XL 8, Ocean 12 V4 7, Ocean 12 XL 6, Trendline 8 V4 8, Trendline 8 5, Trendline 8 XL 4, Smartline 8 V4 6).
  Listings: https://www.berryalloc.com/en/laminate/search-by-colour?page=1..10 and /en/laminate/<range>/<sub-range> (list-1..19). 142 laminate products on the site, 19 in seed, 123 new.
  Product data lives in Next.js flight JSON inside the HTML (self.__next_f.push). Some decors repeat between ranges in different formats. All 75 have a PDF URL.
laminate/HARO: 66 products (TRITTY 100 18, TRITTY 200 Aqua 20, TRITTY 90 11, Special Edition NKL31 11, NKL32 6).
  Listing is JS; product list comes from api.haro.com getAllRelevantProducts (sparte:4 = 396 laminate items, list-api-ids.json) and getProductByIDMultiple (list-api-details-N.json.gz, full data incl. specs, all 396).
  list-1/2.html: finder and assortment HTML pages. Selection: decors not in seed first, Top Connect backing, no Silent variants. Same decor in another format only after unique decors ran out.
  haro.com/ru does not exist (404), so no Russian pages.

vinyl/BerryAlloc: 20 products, vinyl/FineFloor: 20, vinyl/Noventis: 19 (bigfloor.pro) - collected by the earlier run.
vinyl/Enviro: 22 new products (LVT rechte plank 14, LVT visgraat 8; Dutch-language site). 85 product URLs in list-1..5, 33 SPC ones in seed, trapset (stair sets) skipped. Same decors as seed SPC items, but the LVT construction.
vinyl/Kahrs: 24 products from https://www.kahrs.com/uk/floors/lvt-flooring (list-1.html, Dom excluded as in seed). list-2.xml = UK b2c sitemap with 298 LVT-looking URLs incl. v-number duplicates. No separate Russian site used. Product data sits in Nuxt payload in the HTML (no JSON API needed); PDF links are product documents from that payload.
vinyl/FineFloor/img, vinyl/Noventis/img: main photo of every product, <file-stem>.jpg (max 300 px wide, JPEG; Noventis originals are 240 px thumbnails). FineFloor index.tsv column 5 was rebuilt (paths relative to https://finefloor.ru).

carpet/ (broadloom). Every brand has img/<stem>.jpg = main photo, max 300 px wide.
carpet/Betap: 32 colours from 16 collections. Listing: sitemap (list-*.xml) + base-<slug>.html (one page per collection holds all colours). Each colour page ?color=<id>; colour number is in div.color-specs, photo chosen by that number in the file name. No colour group on the site, only numbers. Tile and artificial-grass products excluded.
carpet/AssociatedWeavers: 30 colours of 131 collections' items. Listing list-api.json = POST https://associated-weavers.com/api/productcatalog/filter/list (filterType Carpet, skip 0, take 300; carries colorName, widths, backing, texture, pile height, productCode). Index name = header + colorName. Datasheet PDF has no URL in the HTML (JS download button with data-theme-code/data-color-code), so index has no PDF column. Photo = og:image room shot; packshots in list-api.json. carpet-bilbao-37 returned an error and was skipped.
carpet/ITC: 31 colours from my.itc-carpets.com. list-1 = www broadloom page, list-3..17 = 15 broadloom collection pages, base-<slug>.html = colour lists. PDFs need a login (fe-lock link), so no PDF column. Site returns 429 under fast crawling.
carpet/Carus: 30 colours (Golden gate 12, Grande 13, Brut 3, Nova 2; pool 69 new). All colours sit on the collection page, there is no page per colour, so index "file" = list-N.html and url = collection page. Column 5 is relative to https://www.carusflooring.com. img file = name slugged. Original (natural) and Chevron (natural) list no colours.

carpet-tiles/ Each colour = one product. img/<stem>.jpg = main photo, max 300 px wide, except where noted.
carpet-tiles/Betap: 25 colours (Baltic 3, Larix 5, Santo 6, Sierra 3, Sprinter 4, Vienna 4). base-<slug>.html = collection pages. Vienna/Sierra/Baltic share pages with broadloom; only colours from the tile lines were chosen (4-digit colour codes, or Baltic 3-digit), Polyflex/Bitumen backing, tile PDF in the index.
carpet-tiles/AssociatedWeavers: 25 colours; list-api.json = same API as carpet with filterType CarpetTile (13 collections).
carpet-tiles/Modulyss: 25 colours from 14 collections. All colours sit on the collection page (no page per colour): url = collection page + #anchor, file = list-N.html. Column 5 = signed wasabisys URL that expires; photo already saved in img/ as .webp (original 570 px; System.Drawing cannot read WebP, so not resized). Other 39 collections in list-1.html not fetched.
carpet-tiles/Mohawk: 25 colours from 18 collections; pages have Colour field (hence no img/). Only list-2..19 list colours; page size ~1.4 MB because of embedded multi-language JSON.
carpet-tiles/BLOQ: 25 colours; url = the about= path of each colour on list-2..24 collection pages. No colour field, photo in img/. Site returns 429 under fast crawling.
carpet-tiles/Beaulieu: 25 colours of 36 new; the site has 5 tile collections, 38 colours in all (list-12..16). Finder pages list-1..11 = /en/product-finder?page=N. img/ = .webp (1000 px, not resized).

adhesives/Forbo (Eurocol). Counts: Russian site /eurocol/ru has 102 product URLs = 88 distinct products, ALL already in seed (0 new; the 14 URLs not in seed are the same products under a second category). English site /eurocol/en has 194 URLs = 172 distinct products, 47 of them in seed by product number (or a -germany variant), 125 not in seed. Downloaded 59 of the 125 (en/p-*.html): floor adhesives 29, primers 15, levelling 15. Rest of the 125 is mostly ceramic tile adhesives/grouts, wall products, tools, sundries (en/list-products-browser.txt has all 194).
  Category pages return no product links to plain curl, so the catalogue tree was walked in the built-in browser (34 RU, 83 EN category pages); the URL lists are ru/list-products-browser.txt, en/list-products-browser.txt, raw category HTML was not kept (only list-1.html). Product pages are raw curl downloads. English pages may describe EU formulations; names and packaging can differ from the Russian market.

linoleum/IVC: 6 new (Бетон 577, Дуб Чугунный 896, Дуб Дачный 835, Дуб Шампань 590, Графит 904, Дуб Слоновая Кость 833). list-1..7 = filter pages, /floors/, /bytovoi, /Comm. 197 product cards found on these pages, 89 match seed by name, 108 do not, so far more are available. Seed has no sourceUrl for linoleum, so the check is by name only. Excluded: Texmark Toronto, Sequoia Monetta, Kirov 563.
linoleum/Beauflor: 4 new (Polaris Monterey Oak 976M, Blacktex Columbian Oak 161M, Tex-Style Vichy 707M, Feelings Beech Plank 699S). list-1.xml = sitemap with 1482 English product URLs (pro and home duplicates), list-2.html = finder. /professionals/ pages used.

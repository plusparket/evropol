fill150 - raw pages from manufacturers' official sites. index.tsv in each brand folder:
url, file, name, collection, first main photo URL, then any data sheet PDF URLs.

laminate/BerryAlloc: 75 products (all new; ranges Ocean 8 V4 30, Ocean 8 XL 8, Ocean 12 V4 7, Ocean 12 XL 6, Trendline 8 V4 8, Trendline 8 5, Trendline 8 XL 4, Smartline 8 V4 6).
  Listings: https://www.berryalloc.com/en/laminate/search-by-colour?page=1..10 and /en/laminate/<range>/<sub-range> (list-1..19). 142 laminate products on the site, 19 in seed, 123 new.
  Product data lives in Next.js flight JSON inside the HTML (self.__next_f.push). Some decors repeat between ranges in different formats. All 75 have a PDF URL.
laminate/HARO: 66 products (TRITTY 100 18, TRITTY 200 Aqua 20, TRITTY 90 11, Special Edition NKL31 11, NKL32 6).
  Listing is JS; product list comes from api.haro.com getAllRelevantProducts (sparte:4 = 396 laminate items, list-api-ids.json) and getProductByIDMultiple (list-api-details-N.json.gz, full data incl. specs, all 396).
  list-1/2.html: finder and assortment HTML pages. Selection: decors not in seed first, Top Connect backing, no Silent variants. Same decor in another format only after unique decors ran out.
  haro.com/ru does not exist (404), so no Russian pages.

# Carpet tile maker data (collected 2026-11-05)

Taken only from raw HTML, JSON and PDF files downloaded from the makers' sites.

- `filters.json`: filter groups and values per maker, as each site shows them, with source URLs.
- `products.json`: 27 products. Each value is `{value, source[, note]}` in the maker's wording. `notFound` and `notes` list gaps and conflicts.
- `photos/<slug>.jpg`: first image of each product from the site uploads, max 400 px.
- `raw/pdf-text/`: text of the technical PDFs. Layout text puts values on different rows from labels; values in `products.json` were matched in row order and checked against rendered pages (Vienna, Larix, Renegade, Bruut, First Sway).
- `raw/*.json`: filter responses and filter membership. `build.mjs` built the JSON files.

Modulyss technical PDF links are signed and expire, so sources cite the sheet name and the collection page.

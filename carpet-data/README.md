# Ковролин: сырые данные производителей (временно, для импорта)

- `betap.json`, `carus.json`, `beaulieu.json`, `associated-weavers.json`, `itc.json`: коллекции в общем формате.
- `stock-match.json`: позиции склада с результатом поиска. `found: true` только при совпадении и коллекции, и кода цвета.
  `note` и `otherBrandMatches` подсказывают, что проверить вручную.
- `raw/<сайт>/`: страницы и ответы API, из которых собраны JSON. `raw/carus/datasheet-*.txt`: текст PDF через pdftotext.
- `scripts/`: разбор на Perl (на компьютере нет Python и Node). Запуск: `perl scripts/parse_<сайт>.pl`, затем `perl scripts/match_stock.pl`.

## Что учесть при импорте

- **Betap:** страница сегмента пустая, список идёт из `/actions/productfilter-module/product-filter/search`. Искусственная трава и `* Tile` исключены. `colours[].name` на сайте общий (Grey, Beige).
- **Carus:** характеристики только в PDF, взяты из первого дизайна листа. Original и Chevron natural: цветов на сайте нет.
- **Beaulieu Needlefelt:** только `nf_needlefelt_*`, поле `market` показывает рынок. Automotive, event и outdoor стоит отфильтровать. `datasheetPdf` ведёт на портал медиатеки, не прямо на PDF.
- **Associated Weavers:** цвета из `/api/productcatalog/filter/list` (POST). `catalogType: GB`: страниц на корпоративном сайте нет (404), `pagePublished: false`, ссылка `url` не откроется. У таких коллекций характеристики из API. `image` у цветов не со склада: миниатюра 52 px из API, для них есть `roomImage`. У цветов со склада `image` 280 px. Прямых ссылок на PDF в HTML нет.
- **ITC:** запись на уровне качества (quality), `parentCollection` содержит коллекцию сайта. Цвета с публичной части my.itc-carpets.com, технические PDF там закрыты входом. Характеристики только из карточек качества. Сайт отвечает 429 при частых запросах.

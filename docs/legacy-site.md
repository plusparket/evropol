# Старый сайт europroject.kg

Старый сайт работал на PHP (Joomla-подобные адреса `*.html`). Структура: главная, «О компании», «Продукты»
(разделы с брендами и ссылками на каталоги производителей), «Новости и события», «Контакты».

## Что перенесено

- **Контакты:** г. Бишкек, ул. Токтогула 125/1, БЦ «Авангард», Tower B, офис 212; +996 770 55 77 15 (телефон
  и WhatsApp); info@europroject.kg; Instagram europroject.kg. Хранятся в «Настройках сайта».
- **Тексты:** «О компании» и описания производителей переписаны по скиллу stop-slop (страницы `seed/pages/about.html`,
  `seed/pages/contact.html`, описания брендов в `seed/content.json`).
- **Разделы «Продуктов»:** Винил (Moduleo, BerryAlloc), Ковровая плитка (Modulyss, Betap, IVC Commercial, BLOQ),
  Строительная химия (Forbo Eurocol), Террасная доска (CM Decking), Коммерческий линолеум (IVC Commercial).
  Ссылки брендов ведут на каталоги производителей, как на старом сайте.
- **Новости:** три записи августа 2021 года.
- **Товары не переносились** по решению владельца: у каждого раздела будет свой сайт или страница с товарами и заказом.

## Фото со старого сайта

Облако, где собирался новый сайт, не открывает europroject.kg, поэтому фото переносит сам сайт: при запуске
(`scripts/prepare.ts` → `src/server/legacy-photos.ts`) он читает главную старого сайта и скачивает:

- крупные горизонтальные фото (шире 1000 px), кроме логотипа и значков: в слайдер главной, до восьми штук,
  если в админке слайдер пустой. Стандартная плашка с заголовком при этом убирается: подписи уже есть на фото;
- `images/moduleo.jpg`, `berry.jpg`, `mod.jpg`, `betap.jpg`, `ivc.jpg`, `bloq.jpg`: картинки брендов без логотипа;
- `images/news/ws.jpg`, `kkkk.jpg`, `trrr.jpg`: обложки трёх новостей 2021 года.

Удачная попытка отмечается в настройках (ключ `legacy_photos_imported`) и больше не повторяется. Если старый
сайт не ответил, попытка будет при следующем запуске. Повторить вручную: удалить отметку и перезапустить сайт:

```bash
docker compose exec -T db psql -U europroject -d europroject -c "DELETE FROM settings WHERE key = 'legacy_photos_imported'"
docker compose restart app
```

## Переадресации (301)

| Старый адрес | Новый |
|---|---|
| `/index.php` | `/` |
| `/o-kompanii.html`, `/o-kompanii` | `/about` |
| `/kontakty.html`, `/kontakty` | `/contact` |
| `/novosti-i-sobytiya.html`, `/novosti-i-sobytiya` | `/news` |
| `/produkty.html`, `/produkty` | `/` (разделы на главной) |
| `/143-my-zapustili-svoj-vebsajt.html` | `/news/website-launch` |
| `/144-novaya-kollektsiya-kovrolina.html` | `/news/new-carpet-collection` |
| `/145-terrasnaya-doska-luchshee-resheniya-dlya-letnika.html` | `/news/decking-for-summer-terraces` |

Список лежит в `seed/content.json` и в админке → «Переадресации». Если в Search Console появятся другие старые
адреса с ошибкой 404, их добавляют там же.

## Старый сайт evropol.kg на Joomla

До запуска нового сайта на evropol.kg работал сайт на Joomla. В ноябре 2026 года в нём было около 200 адресов:
каталог `/katalog-bishkek/…`, товары `…/product/view/N/M.html` и `/component/jshopping/…`, страницы вроде
`/паркетная-доска-в-бишкеке.html`. Все они ведут на каталог того же покрытия (301), по словам в адресе
(`legacyJoomlaTarget()` в `src/server/redirects.ts`):

| В старом адресе | Новый адрес |
|---|---|
| moduleo, disano, «виниловый паркет» | `/vinyl` |
| «линолеум» | `/linoleum` |
| modulyss, «ковровые плитки» | `/carpet-tiles` |
| «ковролин», «ковры», «циновки», «коврики», «трава» | `/carpet` |
| «ламинат», товары HARO `/component/jshopping/product/view/5/…` | `/laminate` |
| «паркет», «пробковый», celenio, haro | `/parquet` (дальше на domparketa.kg/parquet) |
| `/доставка` | `/contact` |
| каталог, плинтусы, подложка, остальные страницы | `/` |

Таблица «Переадресации» в админке главнее этих правил.

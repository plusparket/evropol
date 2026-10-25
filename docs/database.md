# База данных

PostgreSQL 18. Схема — `db/migrations/001_init.sql` и `002_section_sites.sql`; новые миграции добавляются файлами со следующим номером и
применяются при старте (список применённых — `schema_migrations`).

| Таблица | Что хранит |
|---|---|
| `users`, `sessions` | администраторы и их сессии (в `sessions.id` — sha256 токена из cookie) |
| `sections` | разделы: `slug` (адрес `/slug`), `name`, `heading`, `summary` (карточка на главной), `description` (HTML), `image`, `link` (внешний сайт раздела), `link_label`, `site_host` (адрес своего сайта раздела, пусто — нет), `site_color`, SEO-поля, `sort_order`, `is_published` |
| `products` | товары сайтов разделов: `section_id`, `brand_id`, `slug` (адрес на сайте раздела, уникален в разделе), `name`, `collection`, `sku`, `attributes` (коротко в карточке), `facets` (значения фильтров), `specs` (таблица) — JSON `[{label, value}]`; `description`, `images` (пути в uploads, первое — главное), `source_images` (фото производителя для скачивания), `source_url`, SEO-поля, `sort_order`, `is_published` |
| `brands` | бренды: `section_id` (раздел, при удалении раздела — NULL), `name`, `logo`, `description` (HTML), `link` (коллекции), `sort_order`, `is_active` |
| `pages` | текстовые страницы: `slug`, `title`, `content` (HTML с `{{placeholder}}`), SEO-поля, `is_published` |
| `news` | новости: `slug` (адрес `/news/slug`), `title`, `excerpt`, `content`, `image`, `published_at`, `is_published`, `views`; у постов Instagram `source = 'instagram'`, `source_id`, `source_url` |
| `menu_items` | ссылки меню: `menu` (`top` — шапка, `footer_company` — подвал), `label`, `url`, `sort_order`, `new_tab` |
| `settings` | настройки «ключ — значение»; `home_content` — JSON главной, `instagram_token` — продлённый ключ Instagram, `section_site:<раздел>` — отметки первичной настройки сайтов разделов |
| `redirects` | 301: `from_path` → `to_path`, `hits`, `last_hit` |
| `visits_daily` | посетители и просмотры по дням для обзора в админке |

Пути картинок (`image`, `logo`) хранятся относительно тома `uploads` и отдаются по адресу `/uploads/…`.

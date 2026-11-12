-- Сайты разделов: у раздела может быть свой сайт (свой адрес, цвет, каталог товаров).
-- Один код и одна база на все сайты: приложение узнаёт сайт раздела по адресу (Host) запроса.
-- Описание таблиц: docs/database.md

ALTER TABLE sections
  ADD COLUMN site_host  text NOT NULL DEFAULT '',   -- адрес сайта раздела без http:// (vinyl.localhost, vinyl.europroject.kg); пусто — сайта нет
  ADD COLUMN site_color text NOT NULL DEFAULT '';   -- основной цвет сайта раздела (#006338); пусто — зелёный логотипа
CREATE UNIQUE INDEX sections_site_host_uq ON sections (lower(site_host)) WHERE site_host <> '';

CREATE TABLE products (
  id              serial PRIMARY KEY,
  section_id      integer NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  brand_id        integer REFERENCES brands(id) ON DELETE SET NULL,
  slug            text NOT NULL,                  -- адрес на сайте раздела: /slug
  name            text NOT NULL,
  collection      text NOT NULL DEFAULT '',       -- коллекция или серия («Click Comfort 55 Plank»)
  sku             text NOT NULL DEFAULT '',       -- артикул
  attributes      jsonb NOT NULL DEFAULT '[]',    -- коротко в карточке: [{label, value}]
  facets          jsonb NOT NULL DEFAULT '[]',    -- значения для фильтров каталога: [{label, value}], у одного label может быть несколько value
  specs           jsonb NOT NULL DEFAULT '[]',    -- таблица характеристик: [{label, value}]
  description     text NOT NULL DEFAULT '',       -- HTML
  images          jsonb NOT NULL DEFAULT '[]',    -- фото: пути внутри /uploads, первое — главное
  source_images   jsonb NOT NULL DEFAULT '[]',    -- адреса фото у производителя: скачиваются при запуске, пока images пустой
  source_url      text NOT NULL DEFAULT '',       -- страница товара у производителя
  seo_title       text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  sort_order      integer NOT NULL DEFAULT 0,
  is_published    boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, slug)
);
CREATE INDEX products_section_idx ON products (section_id, sort_order, id);

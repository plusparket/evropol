-- Метка «В наличии» у товара и категории товаров сайта раздела (группы → категории, как на сайте Forbo Eurocol).
-- Описание таблиц: docs/database.md

ALTER TABLE products
  ADD COLUMN in_stock boolean NOT NULL DEFAULT false;   -- метка «В наличии»; такие товары в каталоге и в категориях идут первыми

CREATE TABLE product_categories (
  id          serial PRIMARY KEY,
  section_id  integer NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  parent_id   integer REFERENCES product_categories(id) ON DELETE CASCADE,   -- пусто — группа верхнего уровня
  slug        text NOT NULL,                  -- адрес на сайте раздела: /slug (не совпадает с адресами товаров)
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',       -- одна-две фразы под названием
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, slug)
);

-- Товар может быть в нескольких категориях (клей 599 — в ПВХ, текстиле, линолеуме и спортивных покрытиях)
CREATE TABLE product_category_items (
  category_id integer NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  product_id  integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, product_id)
);
CREATE INDEX product_category_items_product_idx ON product_category_items (product_id);

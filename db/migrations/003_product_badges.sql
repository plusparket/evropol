-- Метка «Новинка» у товара и вид главной у сайта раздела.
-- Описание таблиц: docs/database.md

ALTER TABLE products
  ADD COLUMN is_new boolean NOT NULL DEFAULT false;   -- метка «Новинка» в каталоге и на странице товара

ALTER TABLE sections
  ADD COLUMN site_layout text NOT NULL DEFAULT '';   -- вид главной сайта раздела: '' — с фото и блоками, 'catalog' — сразу каталог с фильтрами слева

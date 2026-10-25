-- Свой адрес у сайта раздела (например, магазин линолеума на ул. Матросова). Пусто — адрес офиса из настроек.
-- Описание таблиц: docs/database.md

ALTER TABLE sections
  ADD COLUMN site_address text NOT NULL DEFAULT '';

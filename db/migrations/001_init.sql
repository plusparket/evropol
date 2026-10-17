-- Схема сайта «Европроект» (europroject.kg).
-- Описание таблиц: docs/database.md

-- Пользователи панели управления -------------------------------------------
CREATE TABLE users (
  id            serial PRIMARY KEY,
  login         text NOT NULL UNIQUE,
  name          text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id         text PRIMARY KEY,          -- sha256 от токена из cookie
  user_id    integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

-- Разделы: Винил, Ковровая плитка … Каждый ведёт на свой сайт или страницу (link) --------
CREATE TABLE sections (
  id              serial PRIMARY KEY,
  slug            text NOT NULL UNIQUE,          -- адрес страницы раздела: /slug
  name            text NOT NULL,                 -- название в меню и на карточке
  heading         text NOT NULL DEFAULT '',      -- заголовок на странице раздела (пусто — name)
  summary         text NOT NULL DEFAULT '',      -- одна-две строки для карточки на главной
  description     text NOT NULL DEFAULT '',      -- HTML: текст на странице раздела
  image           text NOT NULL DEFAULT '',      -- фото раздела (путь внутри /uploads)
  link            text NOT NULL DEFAULT '',      -- сайт или страница раздела с товарами и заказом
  link_label      text NOT NULL DEFAULT '',      -- подпись кнопки (пусто — «Перейти на сайт раздела»)
  seo_title       text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  sort_order      integer NOT NULL DEFAULT 0,
  is_published    boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE brands (
  id          serial PRIMARY KEY,
  section_id  integer REFERENCES sections(id) ON DELETE SET NULL,
  name        text NOT NULL,
  logo        text NOT NULL DEFAULT '',          -- путь внутри /uploads (пусто — на сайте пишется название)
  description text NOT NULL DEFAULT '',          -- HTML: о бренде на странице раздела
  link        text NOT NULL DEFAULT '',          -- коллекции бренда (сайт производителя или ваша страница)
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);
CREATE INDEX brands_section_idx ON brands (section_id, sort_order);

-- Контент -------------------------------------------------------------------
CREATE TABLE pages (
  id              serial PRIMARY KEY,
  slug            text NOT NULL UNIQUE,          -- адрес: /slug
  title           text NOT NULL,
  content         text NOT NULL DEFAULT '',
  seo_title       text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  is_published    boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE news (
  id           serial PRIMARY KEY,
  slug         text,                              -- адрес записи: /news/slug
  title        text NOT NULL,
  excerpt      text NOT NULL DEFAULT '',
  content      text NOT NULL DEFAULT '',
  image        text NOT NULL DEFAULT '',          -- обложка в списке новостей (путь в uploads)
  source       text,                              -- instagram — запись загружена автоматически
  source_id    text,                              -- номер поста в Instagram
  source_url   text NOT NULL DEFAULT '',          -- ссылка на пост в Instagram
  published_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  views        integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX news_published_idx ON news (published_at DESC);
CREATE UNIQUE INDEX news_slug_uq ON news (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX news_source_uq ON news (source, source_id) WHERE source IS NOT NULL;

CREATE TABLE menu_items (
  id         serial PRIMARY KEY,
  menu       text NOT NULL CHECK (menu IN ('top', 'footer_company')),
  label      text NOT NULL,
  url        text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  new_tab    boolean NOT NULL DEFAULT false
);
CREATE INDEX menu_items_menu_idx ON menu_items (menu, sort_order);

CREATE TABLE settings (
  key   text PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);

-- Переадресации 301 со старых адресов (старый сайт на PHP) -----------------------
CREATE TABLE redirects (
  id         serial PRIMARY KEY,
  from_path  text NOT NULL UNIQUE CHECK (from_path LIKE '/%'),
  to_path    text NOT NULL,
  note       text NOT NULL DEFAULT '',
  hits       integer NOT NULL DEFAULT 0,
  last_hit   timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Статистика посещений (обзор в панели управления) ------------------------------
CREATE TABLE visits_daily (
  day      date PRIMARY KEY,
  visitors integer NOT NULL DEFAULT 0,
  hits     integer NOT NULL DEFAULT 0
);

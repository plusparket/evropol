-- Заявки из анкеты «Оставьте контакты» на странице «Контакты» (владелец, 11.11.2026). Письмо уходит на почту из
-- настроек (info@evropol.kg), если в .env задан SMTP; заявка в любом случае хранится здесь и видна в админке «Заявки».
-- Описание таблиц: docs/database.md

CREATE TABLE leads (
  id          serial PRIMARY KEY,
  first_name  text NOT NULL DEFAULT '',
  last_name   text NOT NULL DEFAULT '',
  company     text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  page        text NOT NULL DEFAULT '',
  emailed     boolean NOT NULL DEFAULT false,
  mail_error  text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_created_idx ON leads (created_at DESC);

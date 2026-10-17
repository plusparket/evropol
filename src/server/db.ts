import postgres from 'postgres';

// Подключение берётся из DATABASE_URL либо из стандартных PGHOST/PGUSER/PGPASSWORD/PGDATABASE.
// Колонки snake_case автоматически превращаются в camelCase (и обратно при вставке через sql(obj)).
function connect() {
  const options = {
    transform: postgres.camel,
    max: Number(process.env.DB_POOL_SIZE ?? 10),
    idle_timeout: 30,
    onnotice: () => {},
    // current_date и now() в запросах считаются в часовом поясе сайта
    connection: { TimeZone: process.env.TZ || 'Asia/Bishkek', application_name: 'europroject' },
  };
  return process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL, options) : postgres(options);
}

type Sql = ReturnType<typeof connect>;

// Один пул на процесс (в dev-режиме модуль может перезагружаться).
const holder = globalThis as typeof globalThis & { __europrojectSql?: Sql };
export const sql: Sql = (holder.__europrojectSql ??= connect());

export type { Sql };

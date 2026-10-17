import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db.ts';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'db/migrations');

/** Применяет по порядку ещё не применённые файлы db/migrations/*.sql. */
export async function migrate(log: (msg: string) => void = console.log): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`;
  // Защита от одновременного запуска нескольких экземпляров приложения.
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(4242001)`;
    const applied = new Set((await tx<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name));
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      const body = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      await tx.unsafe(body);
      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
      log(`миграция применена: ${file}`);
    }
  });
}

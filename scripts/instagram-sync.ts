// Загрузка постов из Instagram в новости (подробнее — docs/news-instagram.md).
//
//   node scripts/instagram-sync.ts        — посты за последние 90 дней, которых ещё нет в новостях
//   node scripts/instagram-sync.ts 30     — за последние 30 дней
//
// После загрузки в новостях остаются 24 самых новых поста Instagram, более старые удаляются вместе с фото.
//
// В Docker: docker compose exec app node scripts/instagram-sync.ts
import { sql } from '../src/server/db.ts';
import { syncInstagram } from '../src/server/instagram.ts';

const days = Number(process.argv[2] ?? 90) || 90;
try {
  await syncInstagram(days, (m) => console.log(`[instagram] ${m}`));
} catch (err) {
  console.error(`[instagram] ${(err as Error).message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}

// Загрузить стартовый контент (со старого сайта) в пустую базу:  docker compose exec app npm run seed
// С флагом --force сначала удаляет весь контент (пользователи админки сохраняются).
import { isDatabaseEmpty, seed } from '../src/server/seed.ts';
import { sql } from '../src/server/db.ts';

const force = process.argv.includes('--force');

if (force) {
  await sql`TRUNCATE brands, sections, menu_items, pages, news, redirects, settings RESTART IDENTITY CASCADE`;
  console.log('контент удалён');
}
if (await isDatabaseEmpty()) {
  await seed();
} else {
  console.log('В базе уже есть контент. Чтобы пересоздать его, запустите: npm run seed -- --force');
}
await sql.end();

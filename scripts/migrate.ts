// Применить миграции вручную:  docker compose exec app npm run migrate
import { migrate } from '../src/server/migrate.ts';
import { sql } from '../src/server/db.ts';

await migrate();
await sql.end();

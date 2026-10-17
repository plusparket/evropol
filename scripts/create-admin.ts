// Создать пользователя админки или сменить ему пароль:
//   docker compose exec app npm run create-admin -- <логин> <пароль>
import { hashPassword } from '../src/server/auth.ts';
import { sql } from '../src/server/db.ts';

const [login, password] = process.argv.slice(2);
if (!login || !password || password.length < 8) {
  console.error('Использование: npm run create-admin -- <логин> <пароль (не короче 8 символов)>');
  process.exit(1);
}

const hash = await hashPassword(password);
await sql`
  INSERT INTO users (login, name, password_hash) VALUES (${login}, ${login}, ${hash})
  ON CONFLICT (login) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true`;
console.log(`Пользователь «${login}» сохранён`);
await sql.end();

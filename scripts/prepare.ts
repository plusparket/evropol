// Подготовка перед запуском: миграции → первый администратор → стартовый контент (если база пустая)
// → новый список разделов и новый адрес с телефоном (один раз) → сайты разделов и их товары (один раз)
// → фото со старого сайта europroject.kg (один раз) → недостающие уменьшенные копии фото главной.
import { migrate } from '../src/server/migrate.ts';
import { ensureAdmin } from '../src/server/auth.ts';
import { isDatabaseEmpty, seed } from '../src/server/seed.ts';
import { ensureHomeVariants } from '../src/server/uploads.ts';
import { sql } from '../src/server/db.ts';
import { ensureNewsSlugs } from '../src/server/content.ts';
import { importLegacyPhotos } from '../src/server/legacy-photos.ts';
import { upgradeHome } from '../src/server/home.ts';
import { upgradeSections } from '../src/server/upgrade-sections.ts';
import { upgradeContacts, upgradeEmail, upgradeWhatsapp } from '../src/server/upgrade-contacts.ts';
import { setupSectionSites } from '../src/server/section-sites.ts';

const log = (msg: string) => console.log(`[prepare] ${msg}`);

export async function prepare(): Promise<void> {
  await waitForDatabase();
  await migrate(log);
  await ensureAdmin(log);
  if (process.env.SEED_ON_START === 'true' && (await isDatabaseEmpty())) {
    log('база пустая — загружаю стартовый контент');
    await seed(log);
  }
  const slugs = await ensureNewsSlugs();
  if (slugs) log(`адреса новостей: ${slugs}`);
  if (await upgradeHome()) log('главная переведена на вид старого europroject.kg');
  for (const msg of await upgradeSections()) log(`разделы: ${msg}`);
  const contacts = await upgradeContacts();
  if (contacts) log(`новый адрес и телефон (ул. Матросова 6/1): изменено записей ${contacts}`);
  if (await upgradeWhatsapp()) log('WhatsApp: новый номер +996 (779) 37 72 73');
  const emails = await upgradeEmail();
  if (emails) log(`почта info@bino.kg: изменено записей ${emails}`);
  for (const msg of await setupSectionSites()) log(`сайты разделов: ${msg}`);
  await importLegacyPhotos(log).catch((err) => log(`фото со старого сайта: ошибка ${err?.message ?? err}`));
  const made = await ensureHomeVariants();
  if (made) log(`созданы уменьшенные копии фото главной: ${made}`);
}

async function waitForDatabase(attempts = 30): Promise<void> {
  for (let i = 1; ; i++) {
    try {
      await sql`SELECT 1`;
      return;
    } catch (err) {
      if (i >= attempts) throw err;
      log(`база недоступна, повтор через 2 с (${i}/${attempts})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// Запуск как самостоятельного скрипта (compose.dev.yaml)
if (import.meta.main) {
  await prepare();
  await sql.end();
}

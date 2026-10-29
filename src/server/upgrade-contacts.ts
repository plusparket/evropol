// Новый адрес и телефон по просьбе владельца от 27.10.2026: г. Бишкек, ул. Матросова 6/1, +996 (779) 37 72 73.
// Один раз при запуске заменяет старый адрес офиса (ул. Токтогула 125/1) и старый телефон в настройках, текстах
// страниц и разделов и ставит карту на новый адрес. WhatsApp владелец перевёл на тот же номер позже, отдельным
// шагом upgradeWhatsapp().
import { sql } from './db.ts';
import { SETTINGS_SCHEMA } from './settings.ts';

const FLAG = 'contacts_2026_10_27';
const NEW_ADDRESS = 'г. Бишкек, ул. Матросова 6/1';
const NEW_PHONE = '+996 (779) 37 72 73';
const OLD_MAP = 'https://maps.google.com/maps?q=%D0%91%D0%B8%D1%88%D0%BA%D0%B5%D0%BA%2C%20%D1%83%D0%BB.%20%D0%A2%D0%BE%D0%BA%D1%82%D0%BE%D0%B3%D1%83%D0%BB%D0%B0%20125%2F1%2C%20%D0%91%D0%A6%20%D0%90%D0%B2%D0%B0%D0%BD%D0%B3%D0%B0%D1%80%D0%B4&z=16&output=embed';
// Сначала полный старый адрес, потом короткий (из описания для поисковиков)
const REPLACE: [string, string][] = [
  ['г. Бишкек, ул. Токтогула 125/1, БЦ «Авангард», Tower B, офис 212', NEW_ADDRESS],
  ['ул. Токтогула 125/1, БЦ «Авангард», Tower B, офис 212', 'ул. Матросова 6/1'],
  ['ул. Токтогула 125/1, БЦ «Авангард»', 'ул. Матросова 6/1'],
  ['+996 770 55 77 15', NEW_PHONE],
];
const swap = (text: string) => REPLACE.reduce((t, [from, to]) => t.replaceAll(from, to), text);

/** Возвращает число изменённых записей (0 — уже сделано или нечего менять). */
export async function upgradeContacts(): Promise<number> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${FLAG}`;
  if (done) return 0;
  let changed = 0;
  await sql.begin(async (tx) => {
    const rows = await tx<{ key: string; value: string }[]>`SELECT key, value FROM settings WHERE key <> 'panel_whatsapp'`;
    for (const r of rows) {
      const next = r.key === 'map_embed_url' && r.value === OLD_MAP
        ? (SETTINGS_SCHEMA.find((s) => s.key === 'map_embed_url')?.default ?? r.value)
        : swap(r.value);
      if (next === r.value) continue;
      await tx`UPDATE settings SET value = ${next} WHERE key = ${r.key}`;
      changed++;
    }
    for (const p of await tx<{ id: number; content: string }[]>`SELECT id, content FROM pages`) {
      const next = swap(p.content);
      if (next === p.content) continue;
      await tx`UPDATE pages SET content = ${next}, updated_at = now() WHERE id = ${p.id}`;
      changed++;
    }
    for (const s of await tx<{ id: number; summary: string; description: string; siteAddress: string }[]>`
      SELECT id, summary, description, site_address FROM sections`) {
      const next = { summary: swap(s.summary), description: swap(s.description), siteAddress: swap(s.siteAddress) };
      if (next.summary === s.summary && next.description === s.description && next.siteAddress === s.siteAddress) continue;
      await tx`UPDATE sections SET summary = ${next.summary}, description = ${next.description}, site_address = ${next.siteAddress},
               updated_at = now() WHERE id = ${s.id}`;
      changed++;
    }
    await tx`INSERT INTO settings (key, value) VALUES (${FLAG}, ${new Date().toISOString()}) ON CONFLICT (key) DO NOTHING`;
  });
  return changed;
}

const WA_FLAG = 'whatsapp_2026_10_27';

/** Номер WhatsApp — тот же, что новый телефон. Меняет только старый номер, другой номер из админки не трогает. */
export async function upgradeWhatsapp(): Promise<boolean> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${WA_FLAG}`;
  if (done) return false;
  const res = await sql`UPDATE settings SET value = ${NEW_PHONE} WHERE key = 'panel_whatsapp' AND value = '+996 770 55 77 15'`;
  await sql`INSERT INTO settings (key, value) VALUES (${WA_FLAG}, ${new Date().toISOString()}) ON CONFLICT (key) DO NOTHING`;
  return res.count > 0;
}

const EMAIL_FLAG = 'email_2026_10_27';
const OLD_EMAIL = 'info@europroject.kg';
const NEW_EMAIL = 'info@bino.kg';

/** Почта info@bino.kg вместо info@europroject.kg: в настройках, текстах страниц и разделов. Возвращает число записей. */
export async function upgradeEmail(): Promise<number> {
  const [done] = await sql`SELECT 1 FROM settings WHERE key = ${EMAIL_FLAG}`;
  if (done) return 0;
  let changed = 0;
  await sql.begin(async (tx) => {
    changed += (await tx`UPDATE settings SET value = replace(value, ${OLD_EMAIL}, ${NEW_EMAIL})
                         WHERE position(${OLD_EMAIL} in value) > 0`).count;
    changed += (await tx`UPDATE pages SET content = replace(content, ${OLD_EMAIL}, ${NEW_EMAIL}), updated_at = now()
                         WHERE position(${OLD_EMAIL} in content) > 0`).count;
    changed += (await tx`UPDATE sections SET description = replace(description, ${OLD_EMAIL}, ${NEW_EMAIL}), updated_at = now()
                         WHERE position(${OLD_EMAIL} in description) > 0`).count;
    await tx`INSERT INTO settings (key, value) VALUES (${EMAIL_FLAG}, ${new Date().toISOString()}) ON CONFLICT (key) DO NOTHING`;
  });
  return changed;
}

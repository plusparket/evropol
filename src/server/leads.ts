// Анкета «Оставьте контакты» (страница «Контакты», владелец 11.11.2026): заявка сохраняется в таблице leads и уходит
// письмом на почту из настроек сайта (info@evropol.kg). Письмо отправляется, если в .env задан SMTP_HOST
// (docs/leads.md); без него заявки видны только в админке «Заявки».
import nodemailer from 'nodemailer';
import { sql } from './db.ts';
import { getSettings } from './settings.ts';

export type Lead = {
  id: number; firstName: string; lastName: string; company: string; email: string; page: string;
  emailed: boolean; mailError: string; createdAt: Date;
};
export type LeadInput = Pick<Lead, 'firstName' | 'lastName' | 'company' | 'email' | 'page'>;

export const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const clean = (v: string, max: number) => v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

/** Проверка полей: пусто — всё в порядке, иначе текст ошибки для посетителя */
export function checkLead(l: LeadInput): string {
  if (!l.firstName) return 'Укажите имя.';
  if (!EMAIL_RE.test(l.email)) return 'Проверьте адрес почты.';
  return '';
}

export function normalizeLead(l: LeadInput): LeadInput {
  return {
    firstName: clean(l.firstName, 100), lastName: clean(l.lastName, 100), company: clean(l.company, 200),
    email: clean(l.email, 200), page: clean(l.page, 300),
  };
}

/** Не больше 5 заявок за 10 минут с одного адреса почты и 30 за 10 минут всего: защита от рассылок */
async function tooMany(email: string): Promise<boolean> {
  const [{ mine, total }] = await sql<{ mine: number; total: number }[]>`
    SELECT count(*) FILTER (WHERE lower(email) = lower(${email}))::int AS mine, count(*)::int AS total
    FROM leads WHERE created_at > now() - interval '10 minutes'`;
  return mine >= 5 || total >= 30;
}

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

async function sendMail(l: LeadInput): Promise<void> {
  const s = await getSettings();
  const to = s.email;
  if (!to) throw new Error('в настройках сайта нет почты');
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } : undefined,
  });
  const name = [l.firstName, l.lastName].filter(Boolean).join(' ');
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || to,
    to,
    replyTo: l.email,
    subject: `Заявка с сайта: ${name}${l.company ? `, ${l.company}` : ''}`,
    text: [
      'Новая заявка из анкеты «Оставьте контакты».', '',
      `Имя: ${l.firstName}`, `Фамилия: ${l.lastName || '—'}`, `Компания: ${l.company || '—'}`, `Email: ${l.email}`,
      `Страница: ${l.page || '—'}`, '', 'Ответьте на это письмо, и ответ уйдёт посетителю.',
    ].join('\n'),
  });
}

/** Сохраняет заявку и пробует отправить письмо. false — слишком много заявок подряд. */
export async function addLead(input: LeadInput): Promise<boolean> {
  const l = normalizeLead(input);
  if (await tooMany(l.email)) return false;
  const [{ id }] = await sql<{ id: number }[]>`INSERT INTO leads ${sql({
    firstName: l.firstName, lastName: l.lastName, company: l.company, email: l.email, page: l.page,
  })} RETURNING id`;
  if (smtpConfigured()) {
    try {
      await sendMail(l);
      await sql`UPDATE leads SET emailed = true WHERE id = ${id}`;
    } catch (err) {
      const msg = String((err as Error)?.message ?? err).slice(0, 300);
      await sql`UPDATE leads SET mail_error = ${msg} WHERE id = ${id}`;
      console.error(`заявка ${id}: письмо не отправлено: ${msg}`);
    }
  }
  return true;
}

export async function listLeads(limit = 200): Promise<Lead[]> {
  return sql<Lead[]>`SELECT * FROM leads ORDER BY created_at DESC LIMIT ${limit}`;
}

export async function deleteLead(id: number): Promise<void> {
  await sql`DELETE FROM leads WHERE id = ${id}`;
}

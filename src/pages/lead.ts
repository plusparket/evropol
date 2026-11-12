// Отправка анкеты «Оставьте контакты» (src/components/LeadForm.astro). После отправки — обратно на страницу
// с отметкой ?lead=ok или ?lead=<ошибка>#lead (POST → 303, повторное обновление страницы заявку не дублирует).
import type { APIRoute } from 'astro';
import { addLead, checkLead, normalizeLead } from '../server/leads.ts';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData().catch(() => null);
  const get = (k: string) => String(form?.get(k) ?? '');
  const back = /^\/(?!\/)[^\s?#]*$/.test(get('page')) ? get('page') : '/contact';
  const to = (state: string) => redirect(`${back}?lead=${state}#lead`, 303);
  // Поле-ловушка: человек его не видит и не заполняет, роботы заполняют
  if (!form || get('website')) return to('ok');
  const lead = normalizeLead({ firstName: get('first_name'), lastName: get('last_name'), company: get('company'), email: get('email'), page: back });
  if (checkLead(lead)) return to('err');
  return to((await addLead(lead)) ? 'ok' : 'busy');
};

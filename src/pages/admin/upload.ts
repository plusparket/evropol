import type { APIRoute } from 'astro';
import { saveImage, uploadUrl } from '../../server/uploads.ts';

// Загрузка картинок из визуального редактора (формат ответа — стандартный для Jodit uploader).
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const files = [...form.values()].filter((v): v is File => v instanceof File && v.size > 0);
  const saved: string[] = [];
  const messages: string[] = [];
  for (const file of files) {
    try {
      const [main] = await saveImage(Buffer.from(await file.arrayBuffer()), 'content');
      saved.push(uploadUrl(main));
    } catch (err) {
      messages.push(`${file.name}: ${(err as Error).message}`);
    }
  }
  return Response.json({
    success: saved.length > 0,
    time: new Date().toISOString(),
    data: { baseurl: '', files: saved, isImages: saved.map(() => true), messages, code: saved.length ? 220 : 400 },
  });
};

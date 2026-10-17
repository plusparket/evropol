import type { APIRoute } from 'astro';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { UPLOADS_DIR } from '../../server/uploads.ts';

// В обычной схеме /uploads/* отдаёт Caddy напрямую из тома. Этот маршрут нужен,
// когда к приложению обращаются в обход Caddy (режим разработки на порту 4321).
const TYPES: Record<string, string> = {
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.pdf': 'application/pdf',
};

export const GET: APIRoute = async ({ params }) => {
  const full = path.resolve(UPLOADS_DIR, params.file ?? '');
  if (!full.startsWith(UPLOADS_DIR + path.sep)) return new Response('Not found', { status: 404 });
  try {
    const info = await stat(full);
    if (!info.isFile()) throw new Error('not a file');
    return new Response(await readFile(full), {
      headers: {
        'Content-Type': TYPES[path.extname(full).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=2592000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};

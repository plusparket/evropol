import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

/** Каталог с загруженными файлами (том Docker). Отдаётся по адресу /uploads/... */
export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR ?? 'data/uploads');

export const uploadUrl = (rel: string | null | undefined) => (rel ? `/uploads/${rel}` : '');

type Variant = { suffix: string; width: number; height?: number; fit?: 'inside' | 'cover' };

const PRESETS = {
  brand: [{ suffix: '', width: 480, height: 240, fit: 'inside' }],
  content: [{ suffix: '', width: 1600, height: 1600, fit: 'inside' }],
  // Фото товаров сайтов разделов: крупно на странице товара и копия 600 px для каталога (productThumb)
  product: [
    { suffix: '', width: 1600, height: 1600, fit: 'inside' },
    { suffix: '-600', width: 600 },
  ],
  // Большие фото (главный экран, разделы) и уменьшенные копии для телефонов и планшетов (srcset).
  // У копий ограничена только ширина — так ширина в srcset совпадает с настоящей.
  home: [
    { suffix: '', width: 2560, height: 2560, fit: 'inside' },
    { suffix: '-1400', width: 1400 },
    { suffix: '-800', width: 800 },
  ],
} satisfies Record<string, Variant[]>;

export type ImagePreset = keyof typeof PRESETS;

/** Суффиксы дополнительных копий (миниатюры, уменьшенные копии) — удаляются вместе с основным файлом. */
const VARIANT_SUFFIXES = [...new Set(Object.values(PRESETS).flatMap((vs: Variant[]) => vs.map((v) => v.suffix)).filter(Boolean))];

/** srcset для фото главной: копии 800 и 1400 px и оригинал (до 2560 px). */
export function homeSrcset(rel: string | null | undefined): string | undefined {
  if (!rel?.endsWith('.webp')) return undefined;
  const base = uploadUrl(rel).slice(0, -'.webp'.length);
  return `${base}-800.webp 800w, ${base}-1400.webp 1400w, ${base}.webp 2560w`;
}

function renderVariant(input: Buffer | string, v: Variant): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: v.width, height: v.height, fit: v.fit ?? 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

const ALLOWED = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'heif']);

function newBaseName(folder: string): string {
  const d = new Date();
  const ym = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${folder}/${ym}/${randomBytes(6).toString('hex')}`;
}

/**
 * Сохраняет картинку: поворачивает по EXIF, уменьшает до размеров пресета и сохраняет в WebP.
 * Возвращает относительные пути (для БД). Первый путь — основной, остальные — уменьшенные копии.
 */
export async function saveImage(input: Buffer, preset: ImagePreset): Promise<string[]> {
  const meta = await sharp(input).metadata().catch(() => null);
  if (!meta?.format || !ALLOWED.has(meta.format)) throw new Error('Файл не является изображением (JPEG, PNG, WebP, GIF, AVIF)');
  const base = newBaseName(preset === 'content' || preset === 'home' ? preset : `${preset}s`);
  await mkdir(path.dirname(path.join(UPLOADS_DIR, base)), { recursive: true });
  const saved: string[] = [];
  for (const v of PRESETS[preset] as Variant[]) {
    const rel = `${base}${v.suffix}.webp`;
    await writeFile(path.join(UPLOADS_DIR, rel), await renderVariant(input, v));
    saved.push(rel);
  }
  return saved;
}

/**
 * Создаёт недостающие уменьшенные копии фото главной — для фото, загруженных до появления копий.
 * Вызывается при запуске (scripts/prepare.ts); возвращает число созданных файлов.
 */
export async function ensureHomeVariants(): Promise<number> {
  const dir = path.join(UPLOADS_DIR, 'home');
  const variants = (PRESETS.home as Variant[]).filter((v) => v.suffix);
  const files = await readdir(dir, { recursive: true }).catch(() => [] as string[]);
  let made = 0;
  for (const file of files) {
    if (!file.endsWith('.webp') || VARIANT_SUFFIXES.some((s) => file.endsWith(`${s}.webp`))) continue;
    const full = path.join(dir, file);
    for (const v of variants) {
      const target = full.replace(/\.webp$/, `${v.suffix}.webp`);
      if (await stat(target).catch(() => null)) continue;
      await writeFile(target, await renderVariant(full, v));
      made++;
    }
  }
  return made;
}

/** Удаляет файлы из uploads вместе с их копиями (ошибки игнорируются — файл мог быть удалён вручную). */
export async function removeUploads(...rels: (string | null | undefined)[]): Promise<void> {
  for (const rel of rels) {
    if (!rel) continue;
    const full = path.resolve(UPLOADS_DIR, rel);
    if (!full.startsWith(UPLOADS_DIR + path.sep)) continue;
    const copies = full.endsWith('.webp') ? VARIANT_SUFFIXES.map((s) => full.replace(/\.webp$/, `${s}.webp`)) : [];
    for (const f of [full, ...copies]) await unlink(f).catch(() => {});
  }
}

/** Достаёт непустые файлы из FormData. */
export function formFiles(form: FormData, name: string): File[] {
  return form.getAll(name).filter((f): f is File => f instanceof File && f.size > 0);
}

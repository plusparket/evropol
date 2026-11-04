// Точка входа production-контейнера: подготовка базы, запуск сервера Astro, загрузка постов Instagram раз в две недели
// и фото товаров сайтов разделов (в фоне, сайт в это время уже работает).
import { prepare } from './prepare.ts';
import { importProductPhotos } from '../src/server/section-sites.ts';
import { scheduleInstagramSync } from '../src/server/instagram.ts';

await prepare();
// @ts-ignore — файл появляется после `astro build`
await import('../dist/server/entry.mjs');
scheduleInstagramSync();
importProductPhotos((msg) => console.log(`[prepare] ${msg}`)).catch((err) => console.error('importProductPhotos', err));

// Точка входа production-контейнера: подготовка базы, запуск сервера Astro и загрузки постов Instagram раз в две недели.
import { prepare } from './prepare.ts';
import { scheduleInstagramSync } from '../src/server/instagram.ts';

await prepare();
// @ts-ignore — файл появляется после `astro build`
await import('../dist/server/entry.mjs');
scheduleInstagramSync();

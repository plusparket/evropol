// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  // Все страницы рендерятся на сервере: контент живёт в Postgres и меняется из админки.
  output: 'server',
  adapter: node({
    mode: 'standalone',
    bodySizeLimit: 60 * 1024 * 1024, // загрузка фотографий в админке
  }),
  // Astro 7 по умолчанию удаляет пробелы между inline-элементами (compressHTML: 'jsx').
  // Вёрстка старого сайта опирается на обычные HTML-пробелы между inline-block карточками.
  compressHTML: true,
  trailingSlash: 'ignore',
  prefetch: false,
  security: {
    checkOrigin: true,
    // Приложение доступно только через Caddy, который выставляет X-Forwarded-Host/Proto.
    allowedDomains: [{}],
  },
  server: {
    host: true,
    port: 4321,
  },
  vite: {
    // Номер сборки: одинаковый в коде страниц и в скриптах браузера. Открытая вкладка сравнивает его с новой
    // страницей и после обновления сайта переходит с полной перезагрузкой (src/scripts/site.ts).
    define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
    server: {
      // В Docker на Windows изменения файлов видны только через опрос (см. compose.dev.yaml)
      watch: process.env.VITE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
    },
  },
});

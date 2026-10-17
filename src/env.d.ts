/** Номер сборки сайта (astro.config.mjs → vite.define) */
declare const __BUILD_ID__: string;

declare namespace App {
  interface Locals {
    /** Пользователь панели управления (только для /admin). */
    user: import('./server/auth.ts').SessionUser | null;
  }
}

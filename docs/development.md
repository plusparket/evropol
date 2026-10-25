# Разработка

На компьютере нужен только Docker (Docker Desktop в Windows и macOS).

## Запуск

```bash
cp .env.example .env
docker compose up -d --build
```

Сайт — http://localhost, админка — http://localhost/admin, сайт раздела «SPC / LVT / кварцвинил» — http://vinyl.localhost
(см. [section-sites.md](section-sites.md)).

Режим разработки с перезагрузкой при правке файлов:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

## Полезные команды

```bash
docker compose logs -f app                                   # логи приложения
docker compose exec app npm run check                        # проверка типов (astro check)
docker compose exec app node scripts/seed.ts --force         # заново залить контент из seed/ (стирает разделы, бренды, страницы, новости, меню, настройки)
docker compose exec app node scripts/create-admin.ts LOGIN PASSWORD   # создать администратора или сменить пароль
docker compose exec app node scripts/instagram-sync.ts       # загрузить посты Instagram в новости
docker compose exec -T db psql -U europroject -d europroject # консоль базы
```

Новая миграция — файл `db/migrations/NNN_name.sql` со следующим номером; применяется при следующем старте.
Изменение схемы описываем в [database.md](database.md).

## Проверка после изменений

- `/`, страница каждого раздела, `/about`, `/contact`, `/news`, `/sitemap.xml`, `/llms.txt` отвечают 200;
- старые адреса из [legacy-site.md](legacy-site.md) отвечают 301 на новые;
- `npm run check` без ошибок.

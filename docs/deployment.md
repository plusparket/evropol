# Развёртывание на сервере

Схема: сервер с Linux и Docker. Caddy сам получает и продлевает сертификаты Let's Encrypt.
Автоматический деплой из GitHub пока не настроен.

## Требования

- сервер: 1–2 vCPU, 2 ГБ RAM, 20+ ГБ диска (Ubuntu 24.04 LTS или Debian 13);
- Docker Engine с плагином Compose (https://docs.docker.com/engine/install/);
- свободные порты 80 и 443. Если на сервере уже работает другой сайт со своим Caddy, этот сайт подключают
  к общему Caddy, а сервис `caddy` здесь не запускают;
- DNS: A-записи `europroject.kg` и `www.europroject.kg` → IP сервера.

## Установка

```bash
git clone https://github.com/plusparket/europroject.git /opt/europroject
cd /opt/europroject
cp .env.example .env
nano .env
docker compose up -d --build
```

В `.env` на сервере:

- `SITE_ADDRESS=europroject.kg, www.europroject.kg`
- `SITE_URL=https://europroject.kg`
- свои `POSTGRES_PASSWORD` и `ADMIN_PASSWORD`. Пароль базы задаётся один раз: база создаётся с ним при первом запуске;
- `INSTAGRAM_TOKEN` — по желанию, см. [news-instagram.md](news-instagram.md).

## Обновление

```bash
cd /opt/europroject
git pull
docker compose up -d --build
```

Миграции применяются при старте. Пока приложение перезапускается, Caddy держит запросы и повторяет их.

## Резервные копии

```bash
# база
docker compose exec -T db pg_dump -U europroject -Fc europroject > europroject-$(date +%F).dump
# загруженные фото
docker run --rm -v europroject_uploads:/u -v "$PWD":/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .
```

Восстановление базы:

```bash
docker compose exec -T db pg_restore -U europroject -d europroject --clean --if-exists < europroject-ДАТА.dump
```

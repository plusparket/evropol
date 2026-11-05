# Документация проекта «Европроект»

| Документ | О чём |
|---|---|
| [architecture.md](architecture.md) | Стек, структура репозитория, как устроены страницы и админка |
| [development.md](development.md) | Локальный запуск в Docker, режим разработки, полезные команды |
| [deployment.md](deployment.md) | Установка на сервер, домен и HTTPS, обновление, резервные копии |
| [section-sites.md](section-sites.md) | Сайты разделов с каталогом товаров: как устроены, как включить новый |
| [seo.md](seo.md) | Поиск Google: что сделано в коде, что сделать в день запуска (домены, Search Console, Analytics) |
| [admin-guide.md](admin-guide.md) | Руководство для редактора: разделы, бренды, главная, страницы, новости, меню, настройки |
| [database.md](database.md) | Таблицы и поля базы данных, миграции |
| [legacy-site.md](legacy-site.md) | Старый сайт на PHP: что перенесено, старые адреса и переадресации |
| [news-instagram.md](news-instagram.md) | Новости и посты из Instagram: загрузка раз в две недели, ключ доступа |
| [changelog.md](changelog.md) | Журнал изменений |

Инструкции для ИИ-агентов — в [AGENTS.md](../AGENTS.md): тексты пишутся по скиллу
[stop-slop](../.claude/skills/stop-slop/SKILL.md), `/llms.txt` и `/llms-full.txt` всегда актуальны.

Правило: изменение архитектуры, схемы БД, запуска или поведения админки сопровождается правкой документа и записью
в `changelog.md`.

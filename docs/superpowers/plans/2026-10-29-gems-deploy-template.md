# Gems: deploy по стандарту Finext

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Единственный stage deploy Gems через self-hosted runner по указанному пользователем шаблону.

**Architecture:** PROJECT_NAME=`gems-storefront`. GitHub Actions из `main` выполняет пять шагов эталона; Compose управляет PostgreSQL, Redis, миграциями, API, Next SSR и всеми workers. Runtime env — единственный источник секретов; backend entrypoint преобразует ключи провайдеров в приватные временные файлы для существующего интерфейса `*_FILE`.

**Tech Stack:** Node 24, Docker Compose, GitHub Actions, PostgreSQL 17, Redis 7.

**Spec:** `../deploy-templates/PROMPT.md`, `../deploy-templates/templates/workflow.deploy.yaml`, `../deploy-templates/templates/multi-service/docker-compose.yaml`.

## Global Constraints

- Текущий checkout, без commit/push; исходный пользовательский перенос frontend сохраняется.
- `name: gems-storefront`, затем `services:`; нет anchors, project image tags, external networks, named volumes или source mounts.
- Self-hosted label `gems-storefront-stage`; env `~/.envs/gems-storefront/.env`; persistent data `/opt/gems-storefront/volumes/`.
- Host ports literal `127.0.0.1:3000:3000` и `127.0.0.1:3001:5202`.
- Workflow: checkout, copy/chmod env, build, up -d, always cleanup. Никаких workflow health-check, down, no-cache.
- Внешний proxy не входит в deploy приложения. Финансовые flags по умолчанию выключены.

## Review Focus

- Миграция должна успешно завершиться до старта API и каждого worker.
- Секрет с кавычками, `$`, переводами строк не должен исполняться shell или попадать в image/logs.
- Одновременные inline и file значения должны давать явную ошибку конфигурации.
- Ошибка подготовки секретов не должна запускать приложение; сигналы должны доходить через shell `exec`.
- Повторный deploy сохраняет данные, удаляет временный workspace env даже после ошибки.

## Task 1: Runtime secrets и Docker

- [x] Добавить тесты `backend/src/runtime-secrets.spec.ts`: байтовое сохранение секрета, права, безопасные exports, file compatibility, конфликт и отсутствие plaintext в child env.
- [x] Увидеть RED, реализовать `backend/src/runtime-secrets.ts` и `backend/docker-entrypoint.sh`, подключить Dockerfile; увидеть GREEN.
- [x] Исправить donor fallback в drizzle config на Gems; production без DATABASE_URL завершается ошибкой.

## Task 2: Workflow и Compose

- [x] Заменить `compose.stage.yaml` на корневой `docker-compose.yaml`, а workflow на пять шагов эталона. Сохранить отдельный CI и локальный compose.
- [x] Создать корневой `.env.example` с runtime inline secrets и Docker database host. Удалить устаревший `deploy/Caddyfile`.
- [x] Обновить deployment/recovery docs: сервер, env, label, порты, зависимости, ручная приёмка, rollback через совместимый commit.

## Task 3: Проверка

- [x] Выполнить unit/lint/typecheck/build backend, Compose config с тестовыми значениями, Docker build.
- [x] Проверить миграции и запуск образов с одноразовыми локальными тестовыми данными; проверить API через Next, секреты через entrypoint и остановку контейнера.
- [x] Проверить workflow syntax, отсутствие старого параллельного deploy, отсутствие реальных секретов, git diff --check.
- [x] Выполнить отдельное ревью изменённых deploy-файлов; записать результат и оставшиеся серверные prerequisites.

## Решения

- Путь пользователя `../deploy-template` разрешён в существующий `../deploy-templates`; шаблон не изменяется.
- Имя `gems-storefront` выбрано по имени репозитория. Stage в терминах шаблона публикует приложение с production runtime; это не основание автоматически включать денежные операции.
- GitHub сейчас сообщает default branch `codex/gems-storefront` и не возвращает доступных repo runners. Подготовка workflow не означает фактический запуск.

## Выполнение

Результаты и границы проверки: [deployment-results](../../testing/deployment-results.md). Runtime secrets и reconciliation worker реализованы через RED → GREEN. Замечание независимого reviewer о SIGTERM в shell-loop и найденный runtime restart loop при disabled provider исправлены отдельным Node worker. Повторные backend verify, Docker build, миграции, HTTP и signal smoke прошли. Прямой deploy, регистрация runner и публикация `main` не выполнялись.

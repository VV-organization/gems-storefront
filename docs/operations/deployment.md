# Gems: запуск

Код использует отдельные PostgreSQL/Redis и секреты Gems. Источник backend: Shardsmarket `02271977e6667f31a47ef3397a642f5e8ab7167e`; определения трёх игр и metadata providers сверены с Vault `6376ba3`. Исторические миграции сохранены, Gems добавляет 0041–0042.

## Локально

```sh
docker compose -f compose.dev.yaml up -d
npm ci --prefix backend
npm ci --prefix frontend
# Только если локального env ещё нет:
test -e backend/.env || cp backend/.env.example backend/.env
npm run db:migrate --prefix backend
npm run dev --prefix backend
# В другом терминале
npm run dev --prefix frontend
```

Frontend: http://127.0.0.1:5201, API: 5202, PostgreSQL: 55461, Redis: 56391. Новые финансовые операции выключены по умолчанию; пустая база не содержит доступных товаров. Каталог наполняется SIH и metadata, дизайнерские цены не используются как запасной источник. Для автономной проверки UI `GEMS_BACKEND_ORIGIN=http://127.0.0.1:5204 npm run build --prefix frontend`, затем `npm run test:e2e --prefix frontend`: это отдельные тестовые HTTP-ответы, не реальные покупки.

Интеграционные тесты работают исключительно на `gems_test` (порт 55462). Они удаляют схему этой тестовой базы перед каждым файлом. URL и имя пользователя проверяются защитой в `test-database.ts`.

## Stage deploy по Finext

Использован шаблон `../deploy-templates`: multi-service Compose + Node SSR frontend. `PROJECT_NAME=gems-storefront`. Это единственный серверный способ deploy; `compose.dev.yaml` предназначен только для локальных БД. Старый ручной SHA workflow, `compose.stage.yaml` и конфигурация внешнего Caddy удалены.

- Workflow: `.github/workflows/deploy.yml`, событие push в `main`.
- Runner: **self-hosted**, имя/label **gems-storefront-stage**. Нужен Linux с Docker Engine и Compose plugin; Node на host не требуется, сборка идёт внутри Docker.
- Server env: **`~/.envs/gems-storefront/.env`** в home пользователя runner.
- Compose: `docker-compose.yaml`, project **gems-storefront**.
- Домен: `getsgems.com`. Целевой сервер из VV-164: `191.101.81.20`.

Workflow содержит ровно пять шагов: checkout → копирование env и chmod 600 → `docker compose build` → `docker compose up -d` → удаление workspace `.env` с `if: always()`. Concurrency не допускает пересечения двух deploy. Отдельный CI с lint/tests/build сохранён. Health-check шагов, `down` и `--no-cache` в deploy нет.

### Подготовка сервера

1. Установить Docker Engine/Compose plugin. Создать отдельного пользователя runner с доступом к Docker. На выделенном сервере проверить, что host-порты 3000/3001 свободны.
2. В GitHub → Settings → Actions → Runners → New self-hosted runner выполнить актуальные команды регистрации Linux runner от его пользователя. Имя и дополнительный label: `gems-storefront-stage`; стандартный label `self-hosted` сохраняется. Установить runner системным сервисом, убедиться в статусе online. В репозитории публичный доступ: не запускать непроверенный PR-код на deploy runner; отдельный CI выполняется на GitHub-hosted.
3. Создать каталоги persistent data `/opt/gems-storefront/volumes/postgres` и `/opt/gems-storefront/volumes/redis`. Каталоги должны принадлежать UID/GID postgres/redis в выбранных образах. Определить их командами `docker run --rm --entrypoint id postgres:17-alpine postgres` и `docker run --rm --entrypoint id redis:7-alpine redis`, затем назначить владельцев каталогам. Не брать UID пользователя runner для данных БД.
4. Создать `~/.envs/gems-storefront/`, права `0700`. Перенести туда безопасный корневой `.env.example` как `.env`, заполнить значения; права файла `0600`, владелец — пользователь runner. Секретные значения не передаются через build args и не копируются в образы.
5. Подготовить `main` с проверенными изменениями и настроить защиту ветки с обязательным CI. Публикация/merge запускают workflow; незарегистрированный runner оставит job в очереди. Не переносить workflow на `pull_request`.

Ни создание `main`, ни регистрация runner, ни серверное развёртывание этой локальной правкой не выполняются автоматически.

### Переменные server env

Корневой `.env.example` — полный безопасный шаблон server env. `backend/.env.example` остаётся локальным примером и использует `*_FILE`; не копировать локальные абсолютные пути в server env.

| Переменные | Значение / назначение |
| --- | --- |
| `POSTGRES_PASSWORD` | Уникальный пароль из `openssl rand -hex 32`; hex безопасен для URL. PostgreSQL user/db фиксированы как `gems`. Compose строит DATABASE_URL с host `postgres`. |
| `COOKIE_HMAC_SECRET`, `DATA_ENCRYPTION_SECRET` | Два независимых случайных значения не короче 32 символов. Encryption secret сохраняется вместе с backup. |
| `PUBLIC_BASE_URL`, `PUBLIC_FRONTEND_ORIGIN` | `https://getsgems.com/api`, `https://getsgems.com` |
| `SIH_API_KEY`, `SIH_STEAM_REFILL_API_KEY` | Предоставленный ключ скинов и разрешённый пользователем ключ Steam refill из Creeps. |
| `PURELYMAIL_SMTP_USERNAME`, `PURELYMAIL_SMTP_FROM`, `PURELYMAIL_SMTP_PASSWORD` | Адрес support@getsgems.com и предоставленный пароль; host smtp.purelymail.com, TLS 465. |
| `STEAM_WEB_API_KEY` | Собственный Steam Web API key для профиля, если используется. |
| `ARCO_PAY_API_KEY`, `ARCO_PAY_BEARER_TOKEN`, `ARCO_PAY_PUBLIC_KEY`, `ARCO_PAY_SHOP_ID` | Собственные merchant credentials, webhook public key PEM и shop id; до их предоставления `ARCO_PAY_PROVIDER_MODE=disabled`. |
| `VV_ADMIN_SITE_KEY`, `VV_ADMIN_WEBHOOK_URL`, `VV_ADMIN_WEBHOOK_SITE_KEY`, `VV_ADMIN_WEBHOOK_SECRET`, `VV_ADMIN_INTEGRATION_SECRET` | Настройки Gems для VV Admin; при отсутствии интеграция не настроена. |
| `GEMS_CHECKOUT_ENABLED`, `GEMS_PAYMENTS_ENABLED`, `GEMS_FULFILLMENT_ENABLED`, `GUEST_STEAM_REFILL_ENABLED` | Изначально `false`; включать по результатам отдельной финансовой приёмки. |

Значения с `$` хранить в одинарных кавычках по синтаксису Compose env; PEM допускает одинарные кавычки и несколько строк. Backend entrypoint сохраняет provider secrets в `/tmp` (tmpfs), назначает `0700/0600`, экспортирует соответствующие `*_FILE` и убирает inline значения из окружения запускаемого процесса. Сам Docker всё равно получает runtime env: пользователь с доступом к Docker имеет доступ к этим секретам. Не задавать одновременно `KEY` и `KEY_FILE` — запуск завершится ошибкой. Financial flags не включаются автоматически.

### Порты и внешняя инфраструктура

| Сервис | Host → container |
| --- | --- |
| Next SSR frontend | `127.0.0.1:3000` → `3000` |
| Nest API | `127.0.0.1:3001` → `5202` |
| PostgreSQL / Redis | Только внутренняя default network Compose |

Next слушает `0.0.0.0:3000`, Nest — `0.0.0.0:5202`. Next собирается с `/api/*` rewrite на `http://api:5202/*`, поэтому внешний proxy может направлять весь сайт на frontend. Если инфраструктура направляет `/api/*` сразу на API, она должна удалять префикс `/api`. TLS, DNS, сертификаты и внешний reverse proxy настраиваются отдельно и не входят в приложение/deploy. Cookie/CSRF/CORS-защиту не отключать.

Steam callback: `https://getsgems.com/api/auth/steam/callback`. Arco callback: `https://getsgems.com/api/payments/webhooks/arco-pay`; return: `https://getsgems.com/payments/return`.

### Запуск и проверка

`docker compose up -d` запускает PostgreSQL/Redis, ждёт PostgreSQL healthcheck и выполняет `migrate`. API и каждый worker зависят от успешного завершения миграций; frontend ждёт readiness API. Все долгоживущие сервисы имеют restart unless-stopped, миграция — restart no. Никакого mount исходников нет. Секретный `.env` удаляется из checkout после workflow, оригинал в home runner сохраняется.

До первого запуска можно проверить конфигурацию, не выводя значения:

```sh
cp ~/.envs/gems-storefront/.env .env
chmod 600 .env
trap 'rm -f .env' EXIT
docker compose config --quiet
```

После deploy выполнить отдельную ручную приёмку: `docker compose ps`, логи миграции/worker (не публиковать потенциально чувствительные логи), readiness, открытие frontend, каталог каждой игры, реальный login/cookie, email delivery. Для команд Compose, которым нужен config, снова временно скопировать env и удалить его через trap, как выше. Успешный workflow не доказывает оплату или выдачу.

`catalog` обновляет supplier каждые 5 минут; `catalog-metadata` отдельно обновляет metadata раз в сутки. Проверять свежесть каждого game и длительность цикла. Financial acceptance: [инструкция](provider-acceptance.md). Восстановление: [recovery](recovery.md). Юридические реквизиты Gems должны быть предоставлены перед публичным запуском.

`reconciliation` — отдельный Node worker: wallet проверяется всегда, provider reconciliation выполняется только при `ARCO_PAY_PROVIDER_MODE=real`. Ошибка одного направления не пропускает другое. SIGTERM завершает текущий цикл и прерывает ожидание следующего; Compose даёт 120 секунд для завершения. Это проверка/сверка, не автоматическое исправление расхождений кошелька.

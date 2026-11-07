# Gems: план подключения мониторинга

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** подключить реальный мониторинг Gems. Инвойсы отложены по последующему
прямому указанию пользователя до появления юрлица.

**Architecture:** существующий site-owned monitoring manifest.
VV Admin хранит запись сайта и результаты проверок; Gems сохраняет свои
цены, видимость и финансовые правила. Платёжный synthetic до готовности недоступен.

**Tech Stack:** Node 24, NestJS, PostgreSQL, Redis, Vitest, Next.js, VV Admin.

**Spec:** [исследование и решение](../specs/2026-11-07-vv-admin-monitoring-invoices-design.md).

## Общие ограничения

- Работать в текущем чистом checkout и ветке, не создавать worktree.
- Не включать платежи/выдачу, не переносить чужие credentials, не отправлять события.
- Только GEMS_TEST_DATABASE_URL → локальная gems_test владельца gems_test.
- Сохранить 1 RUB = 2 Gems, целые minor units и materialized homepage preview.
- Не добавлять invoice profile/capability/endpoints или тестовые PDF.
- Не устанавливать integration credentials для публичных health checks.
- Перед изменением существующих символов попытаться GitNexus impact; индекс Gems
  отсутствует, поэтому сохранить ручную карту callers. Перед commit detect_changes.

## Фокус ревью

- Одна игра свежая, другие stale: отдельный отказ по каждой игре.
- Свежий finished_at при старом observed_at: snapshot не становится здоровым.
- Freshness и доступность привязаны к supplier соответствующей игры.
- Скрытые SKU и пустая категория не делают проверку доступного каталога здоровой.
- Неверная/будущая подпись и включение provider flags: старый scenario не пишет.
- HTTP200 readiness при упавшей БД не подменяет реальный PostgreSQL check.

## 1. Мониторинг и закрытие небезопасного сценария

**Файлы:** integration.service.ts/.spec.ts, integration.controller.ts/.spec.ts,
integration-health.service.ts и focused unit/DB specs,
integration-synthetic-scenario.service.ts/.spec.ts,
vv-admin-scenario-auth.ts/.spec.ts, integration.module.ts, app.module.spec.ts.
Все пути относительно backend/src/modules/integration, кроме app.module.spec.ts.

**Интерфейсы:** PostgreSQL endpoint `/admin/integration/health/postgres`;
`catalogGame(game)` возвращает безопасные counts/age/status; `pricing()` проверяет
активную sih-skins конфигурацию. Неисправность означает status down и HTTP 503.
Сценарий возвращает down, payment.reached=false, пустые entities/artifacts.

- [x] Написать failing tests: реальные DB/Redis ошибки; свежесть каждой игры и
  stale observed_at; пустой/недоступный каталог; невалидная pricing и ratio не 2:1;
  подписи stale/future/tampered/public-prefix; отсутствие финансовых вызовов.
- [x] Исправить manifest: 8 операционных checks каждые 300 секунд,
  browserScenarios.enabled=false, syntheticScenarios/actions=[], schemaVersion=2.
- [x] Реализовать проверки и безопасный отказ, убрать Payments из synthetic service.
- [x] Запустить focused tests; подтвердить HIGH security significance auth вручную:
  единственный прямой caller — integration controller, финансовые methods не меняются.

## 2. Общая проверка и документация

**Файлы:** backend/openapi.json, frontend/src/generated/api-types.ts,
docs/operations/vv-admin.md, docs/testing/vv-admin-verification.md.

- [x] Сгенерировать OpenAPI и frontend types штатными командами проекта.
- [x] `npm run verify` — exit 0, включая неизменность designer source.
- [x] Полный isolated DB suite — exit 0; явно отметить внешний SIH sandbox skip.
- [x] Независимое ревью и нормализация compiled manifest текущим VV parser.
- [x] Проверить diff/status, сохранить только task-owned paths, commit;
  push текущей ветки и fast-forward release в main штатным способом.

## 3. Подключение production мониторинга

- [x] Повторно проверить target host/runner/runtime и baseline финансовых counts.
- [x] Через audited VV API создать Gems (getsgems.com, host191.101.81.20,
  steam_store, provider disconnected) неактивным до установки manifest.
- [x] Не изменять runtime env и credentials: все публикуемые проверки read-only.
- [x] Дождаться CI/deploy exact SHA, проверить public manifest/health и containers.
- [x] Refresh manifest; activate site; дождаться реальных scheduled worker runs,
  затем проверить все 8 manual checks с сохранёнными IDs. Не запускать платёжный flow.
- [x] Проверить UI сайта/операций и честную недоступность user payment test.

## 4. Финальная приёмка

- [x] /invoices/sites: Gems недоступен для генерации; invoiceProfile=null,
  catalog capability отсутствует, новые документы не создавались.
- [x] Финальные financial counts неизменны; записать evidence и точные skipped/deferred
  проверки. Инвойсы deferred по указанию пользователя; оплата не проверяется как
  успешная при отсутствующей конфигурации ArcoPay.

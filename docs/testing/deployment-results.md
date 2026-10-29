# Gems: проверка deploy по Finext, 29 октября 2026

Реализован шаблон `../deploy-templates` (multi-service + Node SSR). Изменения локальные, без commit/push и без deploy на сервер. Итоговый способ запуска: push в `main` → self-hosted `gems-storefront-stage` → `docker compose build` / `up -d`.

## Результаты

| Проверка | Результат |
| --- | --- |
| Backend lint/typecheck/build/OpenAPI | прошли |
| Backend unit/controller | 246 passed; 165 integration tests пропущены в unit-команде |
| Новые runtime secrets tests | 4 passed: права, специальные символы/многострочные ключи, отсутствие plaintext в exports, конфликт inline/file |
| Новые reconciliation tests | 4 passed: disabled provider, независимость ошибок, завершение активного цикла и прерывание ожидания |
| Docker Compose config | 11 сервисов, migration gates, loopback ports, host persistence, без anchors/project image tags/named volumes |
| Docker build | все 9 application images собраны |
| Actionlint | прошёл; custom runner label задан в `.github/actionlint.yaml` |
| Миграция с ошибкой | exit 42 остановил compose up; API/frontend не запущены |
| Успешный запуск | migrate exit 0, 43 migration records; 10 долгоживущих сервисов запущены без рестартов |
| Next → API → PostgreSQL/Redis | readiness, SSR HTML и catalog endpoints CS2/Rust/TF2 — HTTP 200 |
| Реальные host bindings | frontend 127.0.0.1:3000, API 127.0.0.1:3001; HTTP smoke прошёл с host |
| Entrypoint внутри образа | runtime secret прочитан через файл 0600; конфликт не запускает приложение; plaintext не попадает в вывод |
| Production migrate без DATABASE_URL | завершение с ошибкой до подключения; donor fallback удалён |
| Reconciliation | 2 цикла payments disabled / wallet ok; SIGTERM → exit 0 за 0,17 секунды, без forced kill |
| git diff --check / проверка секретов | прошли; предоставленные ключи отсутствуют в tracked/non-ignored файлах |

Тестовые БД/Redis размещались в tmpfs через игнорируемый Compose override; `/opt` на сервере не изменялся. Полный worker smoke работал во внутренней сети без выхода к провайдерам. Отдельно core services проверены с обычной сетью и опубликованными loopback-портами. Каталог был пустым: проверка HTTP/запуска не является проверкой наполнения, покупок или выдачи. Реальные ключи в эти контейнеры не передавались. Локальные журналы: `.local/deploy-verification/`.

## Ревью и исправления

Независимое read-only ревью нашло Important: shell-loop reconciliation не пересылал SIGTERM дочернему процессу. Настоящий запуск дополнительно выявил restart loop при отключённом платёжном провайдере, из-за которого пропускалась проверка кошелька. Оба дефекта исправлены отдельным Node worker; новые тесты прошли RED → GREEN, затем повторены полный backend verify, Docker build и runtime smoke. Critical/Minor замечаний в deploy review не было.

Ревью не подтверждает бизнес-логику вне deploy, реальные деньги, серверный env, runner, DNS/TLS. Эти границы сохраняются: серверные настройки не подменяются локальным smoke.

## Перед первым серверным запуском

- GitHub API не вернул зарегистрированных/доступных runners для репозитория. Зарегистрировать `gems-storefront-stage` и запустить его как service.
- Default branch сейчас `codex/gems-storefront`; подготовить проверенные изменения в `main`. Публикация/merge не выполнены.
- Создать server env `~/.envs/gems-storefront/.env` и каталоги `/opt/gems-storefront/volumes/{postgres,redis}` по [инструкции](../operations/deployment.md).
- SSH на `191.101.81.20` имеющимся локальным ключом вернул `Permission denied`. На сервере ничего не менялось.
- Внешний proxy/TLS/DNS настраиваются отдельно. SMTP-доставка и реальные provider operations на Gems остаются отдельной приёмкой.

# Проверка подключения Gems к VV Admin

Поручение 2026-11-07: исследование → письменный план → реализация → полная
проверка. После исследования пользователь отложил инвойсы до появления юрлица;
текущая приёмка относится только к мониторингу.

## Контроль объёма и зависимостей

| Этапы | Общий контракт | Решение |
| --- | --- | --- |
| Мониторинг / инвойсы | integration manifest и module | Инвойсы отменены до edits; catalog.service.ts не меняется |
| Мониторинг / API contracts | health endpoints | OpenAPI/types генерируются после реализации |
| Manifest / регистрация | восемь GET checks, период 300 секунд | VV запись неактивна до проверки нового manifest |
| Мониторинг / платёжный endpoint | отсутствие финансовых эффектов | Старый endpoint отказывает без PaymentsService; no advertised scenarios |
| SQL / проверка | PostgreSQL authoritative | Focused и полный suite только local gems_test, последовательно |
| Релиз / runtime | существующий main workflow | Без нового checkout, env, credentials и способов публикации |

GitNexus query/impact для Gems вернули repository not found. Выполнен ручной
анализ: integration controller вызывает manifest/health/auth/scenario; финансовые
методы и каталог витрины не изменяются. Auth имеет высокую значимость безопасности;
единственный production caller — сохранённый integration controller.

## Исследование и baseline

- Начальный чистый HEAD `6707e0a` совпадал со свежими remote main и feature branch.
- Host `191.101.81.20`; API/PG/Redis healthy, migrate exit0, десять running сервисов
  без рестартов. Последний code deploy `a830675` был успешным.
- ArcoPay disabled, merchant конфигурация отсутствует, четыре commerce flags false.
- Собственная VV configuration отсутствует. Для публичного monitoring provisioning
  secret не требуется; runtime environment не изменяется.
- Запись Gems создана через audited API неактивной: `cmw6jy1vw001d0jobyes4p6yd`,
  invoiceProfile=null, payment provider disconnected.
- Финансовый baseline: orders/topups/Steam/wallet transactions/ledger/
  fulfillment/notifications/commerce outbox — все ноль.

## Локальная проверка

- `npm run verify` — exit 0: backend 288 passed, frontend 69 passed;
  lint/typecheck/build, OpenAPI sync и неизменность designer source подтверждены.
- `GEMS_TEST_DATABASE_URL=... npm --prefix backend run test:integration` — exit 0,
  177 passed, 1 skipped: внешний SIH sandbox. 178 skips в unit-запуске относятся
  к этому отдельному integration suite, а не к непроверенным SQL изменениям.
- Focused monitoring/auth/HTTP tests — 54/54; настоящие SQL health tests — 10/10.
- Независимое ревью без блокеров; compiled manifest принят текущим VV parser,
  дополнительно AppModule/synthetic HTTP/DI tests 9/9.
- `git diff --check` — exit 0. GitNexus detect_changes снова вернул repository
  not found; проверена вручную область integration, узкий catalog test fixture,
  generated OpenAPI/types и документация. Catalog service и финансовые методы
  не изменяются.
- Повторный production preflight: runner active, 37 GiB свободно, контейнеры
  работают; runtime env и credentials не менялись.

## Production-приёмка

Ожидает release exact SHA, CI/deploy, сохранённых worker/manual run IDs и
браузерной проверки. Локальные проверки не означают завершённого подключения.

## Отложено

- Инвойсы: по прямому указанию пользователя; profile, capability, endpoints и PDF
  не создаются. Юрлицо не подставляется из другого магазина.
- Платёжная приёмка: ArcoPay не настроен. Получение ссылки, конфигурационные health
  ответы и локальные provider fixtures не являются подтверждением реальной оплаты.

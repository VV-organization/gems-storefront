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

- Code release `5fb75a132a15d72209d48db25bcbcd90720c4eb8`, штатный
  [deploy 42386629557](https://github.com/VV-organization/gems-storefront/actions/runs/42386629557)
  — success. Runtime compiled hashes API и VV dispatcher совпали с релизом.
- При переключении контейнеров наблюдался краткий HTTP 502; после завершения
  deploy все восемь GET вернули 200, в том числе при запросе с хоста VV Admin.
  Десять services running, restarts=0; API/PG/Redis healthy, migration exit0.
- Manifest refresh и activation выполнены через authenticated audited VV API.
  Site `cmw6jy1vw001d0jobyes4p6yd`, configurationVersion=6, active=true,
  provider disconnected. Восемь enabled checks, все intervalSeconds=300.
- Админка сохранила старый default 60 секунд для четырёх базовых checks:
  backend/frontend/postgres/redis. Их расписания выставлены в 300 через штатный
  audited schedule API. Три неиспользуемых default checks disabled, без run history.
- Automatic runs: 15:33:59–15:34:02 UTC, все healthy/HTTP200. До этого не было
  manual-run audit; worker log: `ran 8 due checks for 16 sites`.
- Manual runs: 15:34:29–15:34:33 UTC, все healthy/HTTP200; backend запущен кнопкой
  в Chrome, остальные семь через audited API. Подтверждены восемь manual audits.

| Check | Automatic run ID | Manual run ID |
| --- | --- | --- |
| backend_http | `cmw6kczcg00vy0jmxg3b7b6f5` | `cmw6kdlvy00320job3i42doz5` |
| catalog_cs2 | `cmw6kd0gp00w30jmxma75svxq` | `cmw6kdoas00360jobfriodjls` |
| catalog_pricing | `cmw6kd0i400w40jmxn6yuekjd` | `cmw6kdoc200380job7y4n04y3` |
| catalog_rust | `cmw6kd10600w50jmx2j1day2e` | `cmw6kdogx003a0jobfzlcs2ea` |
| catalog_tf2 | `cmw6kd14400w60jmx459aj172` | `cmw6kdolw003c0job1rn3pnpd` |
| frontend_http | `cmw6kd1fy00w70jmxrjs7v3m0` | `cmw6kdouc003e0jobnzbobxqm` |
| postgres | `cmw6kd1gw00w80jmxk8pwus4w` | `cmw6kdov9003g0jobbnl86ovz` |
| redis | `cmw6kd1ho00w90jmx7skq51nf` | `cmw6kdowg003i0jobzsj4abb9` |

- Browser: карточка Gems показывает «Работает» и восемь успешных checks;
  screenshot просмотрен. Console warn/error отсутствуют. Пользовательский тест
  не предлагает платёжный сценарий. В форме инвойсов Gems отсутствует в списке
  доступных сайтов и отображается среди неподключённых с объяснением.
- `/invoices/sites`: invoiceAvailable=false, profile=null; manifest без catalog
  и storeOrders. Существующих инвойсов по-прежнему 3; новый документ не создавался.
- Public unsigned legacy POST — HTTP401. Signed HTTP refusal/no-write проверен
  локально; production secret для этой проверки не устанавливался.
- Capabilities четыре false, ArcoPay disabled/not configured. Orders/topups/
  steam/wallet/ledger/notifications/fulfillment/commerceoutbox до и после — все 0.
  Runtime env и credentials не менялись. Bounded logs восьми backend services —
  без error/cycleFailed/DI errors после рестарта.
- GitHub CI exact SHA: [main 42386629533](https://github.com/VV-organization/gems-storefront/actions/runs/42386629533)
  и [feature 42386629686](https://github.com/VV-organization/gems-storefront/actions/runs/42386629686)
  — success. Browser e2e: 86 passed, 0 skipped, 0 failed (2.3 минуты).
  Внешний SIH sandbox намеренно не запускался.

## Отложено

- Инвойсы: по прямому указанию пользователя; profile, capability, endpoints и PDF
  не создаются. Юрлицо не подставляется из другого магазина.
- Платёжная приёмка: ArcoPay не настроен. Получение ссылки, конфигурационные health
  ответы и локальные provider fixtures не являются подтверждением реальной оплаты.

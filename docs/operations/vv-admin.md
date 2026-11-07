# Gems в VV Admin

Gems остаётся источником правил каталога, кошелька, checkout и выдачи. Текущее
подключение охватывает только операционный мониторинг. Инвойсы отложены по
указанию владельца до подтверждения юридического лица.

## Manifest и проверки

Явный URL discovery: `https://getsgems.com/api/.well-known/vv-admin/manifest.json`.
Префикс `/api` удаляется Next proxy перед Nest; корневой `/.well-known` не является
публичным контрактом. Manifest использует собственные public/admin origins Gems.

Публикуются восемь проверок с периодом 300 секунд:

| Проверка | Что измеряет |
| --- | --- |
| Frontend | HTTP ответ главной страницы |
| Backend | HTTP liveness API |
| PostgreSQL | Реальный SELECT 1 отдельным integration endpoint |
| Redis | Реальный PING |
| CS2 | Публичные и доступные предложения, свежесть supplier snapshot |
| Rust | То же, независимо от CS2 и TF2 |
| TF2 | То же, независимо от CS2 и Rust |
| Настройки цены Gems | Используемую конфигурацию расчёта, включая 1 RUB = 2 Gems |

Для каждой игры свежесть соответствует существующему storefront порогу 15 минут.
Новый finished_at при старом observed_at не означает свежий supplier snapshot.
Наличие строки каталога без свежего активного предложения, положительных цены и
остатка и корректной категории не подтверждает доступность товаров.

Проверка цены не подтверждает актуальность внешнего FX и не меняет курс или
markup. В проекте нет автоматического FX worker. Metadata обновляется отдельно
раз в сутки; supplier freshness нельзя применять к нему как к 15-минутному SLA.

Неисправности возвращают HTTP 503 и фиксированные reason codes. В публичные
ответы не попадают сообщения PostgreSQL/Redis, URL подключения или credentials.
HTTP 200 у общего readiness endpoint сам по себе не доказывает исправность БД.

## Платёжный сценарий

На момент подключения ArcoPay не настроен и финансовые capabilities выключены.
Manifest содержит `browserScenarios.enabled=false`, `syntheticScenarios=[]` и
`actions=[]`. Эти проверки не подменяются зелёным тестом просмотра каталога.

Сохранённый signed endpoint checkout-payment-reached возвращает
`PAYMENT_SCENARIO_NOT_AVAILABLE`, `payment.reached=false`, пустые entities и
artifacts. Он не создаёт/истекает top-up и не зависит от PaymentsService, в том
числе после будущего изменения provider flags. Возврат платёжного сценария
потребует отдельной реализации технической identity, безопасного повторного
запуска и проверки реально загруженного hosted payment document.

Проверка подписи использует публичный API путь из adminOrigin, SHA-256 тела,
canonical UTC timestamp с миллисекундами и окно ±5 минут. Missing secret,
подменённые путь/тело, stale/future timestamp отклоняются. Integration secret
сейчас не устанавливается: опубликованные health endpoints только читают состояние.

## Включение в админке

Создать/проверить Gems с domain `getsgems.com`, host `191.101.81.20`, repository
`VV-organization/gems-storefront`, branch `main`, compose `docker-compose.yaml`,
type `steam_store`, payment provider `disconnected`. До установки проверенного
manifest запись держать неактивной. После deploy обновить manifest через audited
API, затем активировать сайт с текущим expectedConfigurationVersion.

Не устанавливать webhook credentials и не отправлять исторический outbox для
подключения мониторинга. Объявленная commerce schema 2 соответствует существующим
payload, но не является подтверждением подключения доставки событий.

## Приёмка

- Локальные unit и настоящие SQL-тесты на isolated gems_test, контрактные проверки,
  lint/typecheck/build и designer source должны пройти.
- Проверить exact commit CI/deploy, public manifest и health responses, реальные
  сохранённые scheduled worker runs и ручной запуск каждого check в админке.
- Проверить отказ старого payment endpoint; не создавать provider invoice ради
  мониторинга, не включать финансовые flags.
- Проверить наличие восьми check, период 300 секунд, отсутствие enabled browser/
  synthetic сценариев, catalog capability и invoice profile.
- Сверить финансовые counts до/после. Существующие документы, история monitoring,
  outbox и audit сохраняются. Не создавать тестовый инвойс в текущем объёме.

Успешный monitoring check доказывает только названную операционную проверку.
Реальная оплата, зачисление, выдача и доставка Slack — отдельные результаты.

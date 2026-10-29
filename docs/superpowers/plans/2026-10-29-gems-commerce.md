# План реализации Gems / VV-164

> Для исполнителя: выполнять по этапам с `superpowers:executing-plans`. Чекбоксы обозначают будущую работу. Этот документ — результат исследования и план; реализация и публикация ещё не выполнялись.

**Цель:** запустить getsgems.com с текущим дизайном Gems, покупками CS2, Rust и TF2 за Gems, пополнением внутреннего баланса и отдельным прямым пополнением Steam.

**Архитектура:** отдельный NestJS backend на основе Shardsmarket, собственные PostgreSQL/Redis и окружение. Поддержка трёх игр — по модели Vault, встроенная в более новый цикл котировок, резервирования и выдачи Shards. Next.js Gems сохраняет визуальные компоненты и получает серверные данные через типизированный API.

**Стек:** Node 24, TypeScript, Next.js 16 / React 19, NestJS 11, PostgreSQL, Drizzle, Redis/BullMQ, OpenAPI, SIH, платёжный адаптер Arco Pay/Clickit из Shards.

**Спецификация:** [VV-164](https://linear.app/finext-io/issue/VV-164), текущий frontend Gems и уточнения пользователя от 29.10.2026: Steam пополняется по **логину и email**, покупки **всех трёх игр входят в первый запуск**. Эти уточнения приоритетнее старого Steam ID в задаче и ограничения Shards на CS2.

## Подтверждённое исходное состояние

- Gems: HEAD `2164d29`, backend пуст. Frontend перенесён из корня в `frontend/`, но перенос ещё не отражён коммитом: Git показывает 919 удалённых старых путей и новую папку frontend. Это существующая работа пользователя; не сбрасывать и не включать автоматически в чужой коммит.
- Gems: Next 16.3.5, React 19.2.8. 30 текущих unit-тестов прошли 29.10.2026. Сборку/typecheck не запускали: зависимости в frontend не установлены.
- Проверены исходники и опубликованная главная на GitHub Pages. Визуал: Commissioner, тёмно-зелёная палитра, золотые акценты, карьер в hero, анимации, собственные блоки сравнения и подбора по бюджету.
- Главная использует отдельный снимок из 68 предметов. Каталог загружает статические индексы от 12.10.2026: CS2 — 28 592, Rust — 5 019, TF2 — 628; всего 34 239. Это не доказательство текущего наличия.
- `shop-provider.tsx`: корзина/избранное/trade URL и признак входа в localStorage. `account-view.tsx` показывает нулевой баланс и пустые истории. `integrations.ts` и Next API маршруты закрывают финансовые операции как unavailable.
- Shardsmarket: чистый checkout, HEAD `02271977e6667f31a47ef3397a642f5e8ab7167e`. Есть Steam OpenID, email OTP, wallet ledger/holds, серверная корзина, котировки, платёжные сессии, webhook/reconciliation, выдача, история, уведомления и VV Admin.
- В Shards `catalog-game.ts` разрешает только CS2; `catalog.service.ts` жёстко фильтрует CS2; `quoted-checkout.service.ts` и `fulfillment-operation.service.ts` фиксируют `game:'cs2'`. Наличие типов Rust/TF2 в адаптере SIH само по себе не включает их покупку.
- Проверены публичные GET Shards: readiness PostgreSQL/Redis — ok; платёжные capabilities включены; CS2 каталог отвечает, Rust/TF2 возвращают `400 Unsupported catalog game`. Реальные оплаты/выдача не проверялись; SSH не потребовался.
- Vault: HEAD `6376ba3`, есть пользовательские изменения в документации и auth UI — не трогать. В `catalog-game.ts` включены три игры. `fulfillment.service.ts` передаёт `pending.game` в SIH; `fulfillment.integration.spec.ts:582` содержит проверки Rust/TF2 с appId 252490/440. Это изученные тесты с подменённым HTTP, не выполненная сейчас live-проверка поставщика.

## Решение о переиспользовании

| Часть | Решение |
| --- | --- |
| Backend Shards | Основной донор: скопировать исходники, миграции, тесты и контракты по явному списку; адаптировать под Gems |
| Frontend Shards | Взять API-клиент, журнал команд, обработку auth/payment/return, типы и тестовые подходы; JSX/CSS целиком не переносить |
| Vault | Перенять поддержку игр, правила публикации каталога, метаданные, appId и тестовые сценарии Rust/TF2 |
| Выдача Vault | Не заменять ею новый обработчик Shards: Vault читает текущие listing/credentials при выполнении, Shards фиксирует параметры заказа и восстанавливает операции по постоянному ID |
| Дизайн Gems | Сохранить CSS, локальный шрифт, assets, композицию, движения, responsive и компоненты сравнения/подбора |
| Окружения доноров | Не переносить .env, секреты, production данные, .git, node_modules, образы, настройки публикации, merchant IDs и аналитические счётчики |

Один общий backend/БД с Shards создал бы зависимость кошельков, сессий и релизов двух магазинов. Полное копирование Vault внесло бы другой платёжный сценарий и более старый обработчик выдачи. Выбран отдельный Gems с Shards как основой и целевым расширением по Vault.

## Общие ограничения и решения

1. Валюта Gems: **1 ₽ = 2 Gems**. Все суммы — целые минимальные единицы; 100 единиц = 1 RUB или 1 Gems. `rubToGemsMinor(rubMinor)=rubMinor*2`; справочный обратный пересчёт округляется half-up. Пример VV-164: 1 540 006 минимальных Gems = 770 003 копейки.
2. Skin checkout — только внутренний доступный баланс. Карта/СБП оплачивают пополнение Gems или Steam. Steam refill не меняет wallet Gems.
3. Нельзя менять RUB стоимость только из-за переименования валюты. Live цена определяется свежим поставщиком и серверной политикой, а не фиксируется навсегда по снимку дизайнера. Начальная предлагаемая политика — унаследованные 20% markup Shards и тот же алгоритм FX; это нужно проверить на окружении Gems до активации.
4. Предлагаемые начальные лимиты наследуются от Shards: 100–100 000 целых Gems на пополнение; Steam 50–9 433 целых RUB, комиссия 5%. Удаление фразы о комиссии в VV-164 не отменяет саму комиссию. Лимиты/комиссия приходят из backend config/quote и проверяются на контракте выбранного терминала.
5. Данные пользователя, цена, наличие, wallet, cart, order и статусы — серверные. LocalStorage допустим для избранного, гостевого черновика и восстановления намерения; клиентские суммы не являются доверенными.
6. В первый релиз входят CS2/Rust/TF2 и смешанная корзина. Dota, Apple-карты, продажа пользователем скинов, Duo из Shards и новые механики не добавляются.
7. Точные float из снимка не являются характеристиками поставляемого SIH SKU. Сохранить визуальные места, показывая «Не указан», когда API не даёт достоверное значение; не обещать выдачу конкретного asset/float. Wear CS2 сохраняется; для Rust/TF2 CS2-поля не показывать.
8. Сохранить гостевой выбор товаров и избранное. После реального входа переносить только распознанные товары с серверной перепроверкой, без автоматической оплаты. Старый preview-login игнорировать; сохранённый trade URL требовать повторно подтвердить на сервере.
9. Исторический `frontend/AGENTS.md` про создание нового дизайна и автоматическую реализацию не переопределяет текущий запрос на сохранение визуала и подготовку плана. При реализации обновить правила под этот документ.

## Риски, которые обязаны покрывать проверки

- Один marketHashName в разных играх: ключ идентичности и блокировок включает игру; правильный appId доходит до SIH (этапы 3–4).
- Таймаут после внешнего списания/создания: восстановление той же операции; повтор не создаёт новое списание или выдачу (4, 8).
- Последние строки смешанного заказа завершаются одновременно или частично: одно settlement, удержание неизвестных результатов, корректное освобождение остатка (4).
- Смена пользователя/вкладки/цены после выбора: старые ответы не попадают новому владельцу; quote привязан к версии корзины/получателя (6–8).
- Старые ссылки/корзина/неполные метаданные: нет подмены товара, фиктивной доступности или молчаливой потери пользовательского выбора (3, 5–6).

## Этап 1. Основа репозитория и контроль сохранения дизайна

**Файлы:** корневые `AGENTS.md`, `.gitignore`, `package.json`; `frontend/AGENTS.md`; новые `docs/testing/gems-designer-baseline.json`, `frontend/scripts/check-designer-assets.mjs`, `frontend/playwright.config.ts`, `frontend/e2e/visual.spec.ts`.

- [ ] Зафиксировать состояние путей до работы, оформить перенос root → frontend без потери исходных файлов; git staging только известных путей, без reset/clean и автопуша.
- [ ] Добавить корневые команды проверки обоих пакетов и правила сохранения дизайна. Оставить Node 24; версии фронта согласовать с выбранным донором после проверки lockfile.
- [ ] После установки зависимостей запустить исходный Gems на свободном порту 5201. Снять baseline локальной версии: главная, каталог каждой игры, товар, quick view, корзина и кабинет на 1440, 768, 390 и 320 px; отдельно движения и reduced-motion.
- [ ] Сохранить контрольные суммы assets/шрифтов/CSS и перечень разрешённых отличий: правки VV-164, реальные данные/статусы, поле логина и email. Новые состояния оформить существующими компонентами.

**Проверка:** исходные 30 тестов; typecheck/lint/build. Baseline создаётся из пользовательского дизайна до переписывания логики.

## Этап 2. Перенос backend и денежная модель Gems

**Источник:** `../shardsmarket/backend/{src,drizzle,package.json,package-lock.json,tsconfig*.json,vitest*.ts,eslint.config.*,drizzle.config.*,openapi.json}` — перед копированием сверить фактические имена. Dockerfile/entrypoint изучить и адаптировать отдельно, не копировать deployment окружение.

**Изменения:** `backend/src/common/money/gems.ts` вместо `shards.ts`; `config/app-config.ts`; `modules/storefront/storefront.service.ts`; `modules/catalog/{catalog-pricing.service.ts,catalog.service.ts,catalog.types.ts}`; payment terms, notifications, integration/outbox; session/guest cookie namespaces; тестовый DB guard; новая миграция `0041_gems_pricing.sql` после текущей `0040` (номер перепроверить при старте).

**Интерфейс:** `rubToGemsMinor(number):number`, `gemsToRubReferenceMinor(number):number`, `topUpFiatMinor(number):number`, `sumGemsMinor(readonly number[]):number`; `/storefront/config` отдаёт `currency:'Gems'`, rate 100:200 и новую версию условий.

- [ ] Добавить тесты курса 1:2, минимального/максимального пополнения, дробных/отрицательных/переполняющих сумм, каталога и settlement. Наблюдать падение против старого курса 8/5.
- [ ] Перенести backend по allowlist. Убрать активные ненужные endpoints, включая Duo/Apple; исторические миграции сохранить совместимыми.
- [ ] Привести runtime branding, cookies (`__Host-gems_*`), event IDs, currency `GEMS`, storage/queue namespace, env prefix `GEMS_*`, site key и тестовые URL к отдельному проекту. Не выполнять слепую замену всех исторических SQL строк.
- [ ] Добавить новую pricing setting 2/1, не переписывая прошлые миграции. Проверить, что fresh DB после всей цепочки имеет ровно одну активную политику SIH и финальный курс Gems; seed товары не появляются как доступные.
- [ ] Завести отдельную disposable БД `gems_test`/пользователя `gems_test`; guard `GEMS_TEST_DATABASE_URL` должен отвергать любые БД доноров и нелокальные адреса.

**Проверка:** `npm --prefix backend run verify`; миграции с нуля + `test:integration` только на gems_test. В тесте 1 000 Gems пополняются за 500 RUB, а 15 400,06 Gems соответствуют 7 700,03 RUB.

## Этап 3. Живой каталог трёх игр

**Файлы:** `backend/src/modules/catalog/{catalog-game.ts,catalog.service.ts,catalog.types.ts,catalog-supplier-sync.service.ts,catalog-product-projection.ts,catalog-metadata-sync.service.ts}`; `catalog-sync-all-games.ts`, `catalog-sync-worker.ts`, `config/app-config.ts`; новая `modules/catalog/catalog-multi-game.integration.spec.ts`.

**Источник Vault:** те же catalog-модули, `catalog-game.ts`, `providers/{csgo-api,scmm,tf2-autobot}`. Многие части уже присутствуют в Shards — сравнивать и адаптировать, не дублировать.

**Контракт:** игры `cs2|rust|tf2`, appId `730|252490|440`; API `/catalog?game=...`, `/catalog/:slug`, `/catalog/lookup` сохраняет совместимость. DTO содержит game, стабильный slug, revision, цену, доступность и категорию нужной игры.

- [ ] Сначала тесты: три игры, неизвестная игра, одинаковые market names между играми, отсутствие metadata, неполный sync, устаревшее наличие, пустая выдача, корректные счётчики при фильтрах.
- [ ] Разрешить `CATALOG_PUBLIC_GAMES=cs2,rust,tf2`; убрать CS2-only условия не только из списка, но и lookup/detail/count/facets и readiness.
- [ ] Восстановить публикацию Rust/TF2 по Vault: SIH определяет наличие/цену, SCMM/TF2 Autobot — обязательные metadata; отсутствие обязательных данных не компенсируется snapshot из дизайна.
- [ ] Проверить migration/category backfill Shards: классификатор CS2 не должен назначать категории Rust/TF2. Ввести стабильную идентичность категории внутри игры и использовать её во всех фильтрах/counts.
- [ ] Обеспечить независимый sync и freshness для каждой игры. Сбой Rust не удаляет CS2/TF2; неполный ответ не трактуется как достоверный пустой ассортимент.
- [ ] Сохранить серверные сортировки по цене/имени, поиск, фильтр Gems, пагинацию по 24, корректное количество результатов. Добавить фильтрацию `availability=available` для покупаемых подборок, применяя её одинаково к items и counts.

**Проверка:** unit/catalog integration suites; каждый game API возвращает только свою игру и реальные категории; цена всех трёх игр рассчитана по одной активной политике Gems.

## Этап 4. Котировки и выдача смешанной корзины

**Файлы:** `backend/src/modules/checkout/quoted-checkout.service.ts`; `modules/fulfillment/fulfillment-operation.service.ts`; `modules/providers/sih/{sih.client.ts,sih-contract.ts,sih.types.ts}`; новые `checkout/multi-game-checkout.integration.spec.ts`, `fulfillment/multi-game-fulfillment.integration.spec.ts`.

**Контракт:** `POST /checkout/quotes {cartVersion}` → `id,items,totalCoinMinor,totalRubMinor,expiresAt`; `POST /checkout/cart {quoteId,cartVersion}` + `Idempotency-Key`. Immutable snapshot каждой строки содержит проверенную game, marketHashName, cost cap, recipient и постоянный providerOperationId.

- [ ] Написать тесты смешанного заказа CS2/Rust/TF2, appId 730/252490/440, чужого trade URL, изменения цены/игры/получателя, недостатка средств и истечения quote.
- [ ] Передавать game из серверного товара в свежий SIH precheck и snapshot. Блокировать supplier listings по `(supplier,game,market_hash_name)` в детерминированном порядке, не по одному имени.
- [ ] В обработчике Shards валидировать enum трёх игр и передавать snapshot.game в SIH. Использовать Vault как пример game/appId, сохранив постоянный operation ID, cost cap, encrypted recipient, lease/fencing и recovery Shards.
- [ ] Проверить timeout после отправки, падение worker и поздний ответ старого worker: lookup/reconciliation с прежним ID; отсутствие доказательства результата → manual_review, без нового create.
- [ ] Проверить частичную выдачу и одновременное завершение последних строк: capture только завершённых строк, release только подтверждённо невыданных; неизвестные операции остаются удержанными. `sent` не равен окончательной доставке.
- [ ] Проверить историю/VV Admin и уведомления для partially_fulfilled, а также повтор terminal event без второго списания.

**Проверка:** checkout/fulfillment DB suites и commerce smoke с трёхигровой корзиной. Провайдерный HTTP в локальных тестах подменён; real acceptance отдельно.

## Этап 5. API frontend, каталог и особые блоки Gems

**Перенос логики из Shards:** `frontend/src/lib/{api,command-journal,pending-intent,use-remote,use-quote,use-draft,guest-payment,hosted-checkout,commerce-status}.ts`; `scripts/sync-api.mjs`; генерация `src/generated/api-types.ts` из Gems OpenAPI.

**Адаптация Gems:** `frontend/next.config.ts`; под `frontend/src/`: `lib/{types,catalog,reference-catalog,games,filters,product-storage,money}.ts`, `components/use-game-catalog.ts`, `components/{catalog-view,reference-item,products,home,collection-stage,skin-compare,category-dossiers,budget-finder}.tsx`, `app/catalog/[id]/page.tsx`, `app/item/page.tsx`.

- [ ] Подключить same-origin `/api` proxy через `GEMS_BACKEND_ORIGIN`, динамические страницы и backend OpenAPI; удалить конфликтующие заглушки `/api/checkout`, `/api/topups/[kind]` и устаревший `/api/steam/check` после замены потребителей.
- [ ] Создать `mapProduct(dto:CatalogApiProduct):Product` с game/slug/revisions/availability. Все цены карточек, модальных окон, сравнения, избранного и бюджета получают серверный источник.
- [ ] Сохранить query URL, game selector, специфичные фильтры, 24 → 48, retry/empty/loading; смена игры сбрасывает несовместимые параметры. Отменять устаревшие ответы при переключении.
- [ ] Добавить явный каталог legacy aliases для старых `/catalog/<id>` и `/item?game=...&id=...`, сопоставленный по game и точному marketHashName. Совпадение перевода/имени без доказательства не использовать. Отсутствующий/неоднозначный SKU показать недоступным с сохранением выбора пользователя.
- [ ] Заменить hardcoded home IDs привязками к live SKU; прежние artwork использовать только как иллюстрации точно сопоставленных предметов. Отсутствующий товар не получает fake цену из snapshot.
- [ ] «Под бюджет»: серверный запрос с верхней ценой в Gems, сортировка price_desc, 6 карточек и полный count; точный бюджет RUB переводится в Gems до запроса. Сравнение загружает варианты по выбранному оружию постранично, не только первые 24 товара; выбранные SKU сохраняются отдельно.
- [ ] Категории и их числа строятся из актуального API. Избранное остаётся локальным списком идентификаторов, а детали перепроверяются через lookup порциями до 50.

**Проверка:** adapter/filters/legacy-links/budget tests; `api:check`, typecheck/lint/build; браузер по всем трём играм, дорогие товары, пустые изображения, прямые ссылки и reload.

## Этап 6. Реальный вход, профиль и серверная корзина

**Файлы:** `frontend/src/components/{shop-provider,account-view,cart-view,products}.tsx`; `lib/{api,pending-intent,product-storage}.ts`; новые `lib/guest-cart-migration.ts`, `tests/guest-cart-migration.test.ts`, `e2e/auth-cart.spec.ts`. Backend auth/session/cart/users берётся из Shards.

**Контракты:** `/auth/steam/start`, `/auth/steam/callback`, `/session/me`, `/session/csrf`, `/session/logout`, `/me/steam-trade-url`; `/cart`, `PUT/DELETE /cart/items/:productSlug` с `expectedCartVersion` и `Idempotency-Key`.

- [ ] Заменить local preview login на проверяемую Steam-сессию. Адаптировать существующее модальное окно; email sign-in оставить для истории прямых Steam пополнений. Email-only identity не даёт права покупки скинов или пополнения Gems без Steam.
- [ ] Trade URL сохраняется и проверяется на backend, принадлежит авторизованному Steam. В UI возвращается безопасный статус; token не помещать в аналитику/журналы.
- [ ] Сохранить добавление гостя в локальный черновик. При входе резолвить товары, сверять серверные revisions, подтверждать изменившиеся цены и переносить по одному с устойчивыми ключами/версиями. Удалять из черновика только подтверждённо перенесённые строки; неразрешённые оставить с понятным сообщением.
- [ ] Авторизованная корзина всегда серверная: quantity=1, максимум 50 SKU, без дублей. Notice «Добавлено» показывать после подтверждения mutation; quick view сохраняет уведомление внутри dialog.
- [ ] Logout/смена владельца очищает старые owner-bound данные и запросы. Pending login intent и безопасный returnTo не позволяют перенести чужую команду или внешний redirect.

**Проверка:** auth/cart integration и browser: add → notice → cart → reload, anonymous → Steam → cart, две вкладки, конфликт версии, частичный перенос, смена пользователя, Escape и возврат фокуса.

## Этап 7. Корзина и кабинет по VV-164

**Файлы:** `components/{cart-view,account-view,price}.tsx`; адаптированные истории и статусы; `tests/vv164-cart.test.ts`, `e2e/wallet-checkout.spec.ts`.

- [ ] Загрузить `/wallet/me`, показывать доступные Gems и отдельный резерв. Во время загрузки не рисовать фиктивный нулевой баланс.
- [ ] Удалить выбор «Баланс/Карта/СБП» и payment logos из корзины. Цена и итог Gems + RUB; гость видит «Войти», пользователь с достаточными средствами — «Оплатить Gems».
- [ ] При нехватке отключить оплату, показать «Не хватает N Gems (≈ M ₽)» и рабочий переход `/account?tab=balance&returnTo=cart` с предзаполнением допустимой суммы. Лимит пополнения явно отражать, не создавать цепочку платежей автоматически.
- [ ] Оплата использует серверную quote и ту же cartVersion; изменение условий требует нового подтверждения. После пополнения обновить wallet/cart/quote; автоматически скины не покупать.
- [ ] Кабинет показывает серверные `/orders/me`, `/wallet/me/transactions`, `/payments/me/history`, `/fulfillment/me/trades`, configured trade URL и профиль. Различать загрузку, ошибку и пустую историю, paid и delivered, частичный заказ и manual_review.

**Проверка:** достаточный/недостаточный/ровно равный баланс, резерв, устаревшая цена, неверный recipient, повтор клика, returnTo после пополнения, частичная выдача.

## Этап 8. Пополнение Gems и прямое пополнение Steam

**Файлы:** `components/topups.tsx`, новые `components/{payment-action,payment-status}.tsx`, `app/payments/return/page.tsx`, `lib/{hosted-checkout,guest-payment,command-journal}.ts`; backend payment modules из Shards.

**Контракты:** `/payments/top-up/{quotes,sessions}`; `/payments/guest/context`, `/payments/guest/steam-refill/{quotes,sessions}`; owner-bound `/payments/sessions/:id` и guest status/check; `POST /payments/webhooks/arco-pay`.

- [ ] BalanceForm на главной и в кабинете использует серверную quote. Вместо выбора методов точный текст «Банковская карта или СБП»; выбор происходит на поддерживаемой форме провайдера.
- [ ] SteamForm использует логин Steam + email, amount RUB и серверную проверку SIH. Гостевая оплата не требует предварительного Steam-входа; email для чека не считается автоматически подтверждённой identity. Привязка истории после OTP — как в Shards.
- [ ] Основная подпись кнопки Steam — «Пополнить Steam», загрузочные/ошибочные состояния отражают фактическую стадию. Убрать только предложение «Комиссия 5% включена в итог.» из описания; сохранить расчёт комиссии и итога.
- [ ] Перенести lifecycle исправления Shards: новая подтверждённая пользовательская попытка может создать новый платёж; неизвестная попытка восстанавливается с тем же ключом; checkout живёт 15 минут и проверяет canPay перед повторным открытием.
- [ ] Return page читает backend status; query-параметры success не зачисляют деньги. Signed webhook/reconciliation однократно зачисляет Gems либо запускает Steam fulfillment, с проверкой владельца/суммы/валюты/провайдера.
- [ ] Настройки merchant, callback, return URL и допустимые checkout origins — только Gems. Не переносить SBP 1/SBP 2 из Vault: это другой продуктовый платёжный сценарий.

**Проверка:** payment binding/webhook/guest history integration; browser success/pending/decline/expiry, возврат после потери сессии, повтор webhook, timeout и восстановление; Steam платёж не изменяет Gems ledger.

## Этап 9. Тексты, FAQ и визуальная приёмка

**Файлы:** `components/{shell,topups,products,skin-inspection,reference-item,help-desk}.tsx`, `app/catalog/[id]/page.tsx`; `e2e/vv164.spec.ts`, visual fixtures.

- [ ] В шапке всех страниц «Скины» → «Каталог».
- [ ] Удалить способы оплаты на странице скина и в quick view; отсутствие проверить также у импортированных `/item`.
- [ ] Заменить FAQ на все шесть вопросов и ответов VV-164: валюта, пополнение Gems, покупка, получение, Steam, поддержка. В ответе про Steam по решению пользователя заменить Steam ID на логин и email; поддержка `support@getsgems.com`.
- [ ] Уточнить формулировку получения: Steam identity и trade URL для скинов; не смешивать их с login/email прямого пополнения. Статус фактической выдачи показывать в кабинете.
- [ ] Сравнить baseline: hero/фон/Commissioner/цвета/карточки/сетка/анимации сохранены; изменения размеров форм ограничены добавленными реальными полями и текстами.
- [ ] Проверить длинные названия, общие линии цен/кнопок карточек, quick view, клавиатуру, Escape, focus return, reduced-motion, отсутствие горизонтального scroll на 320/390 px.

**Проверка:** traceability всех пунктов VV-164; desktop/mobile e2e; `visual:source` и сравнение снимков с явным перечнем допустимых отличий.

## Этап 10. Операционное окружение и запуск

**Новые файлы:** `compose.dev.yaml`, `compose.stage.yaml`, собственные Dockerfile/entrypoint, `.github/workflows/ci.yml`, собственный deploy workflow, `docs/operations/{deployment,provider-acceptance,recovery}.md`, `docs/testing/acceptance-results.md`.

- [ ] Создать отдельные контейнеры API/frontend/PostgreSQL/Redis и workers: catalog всех игр, fulfillment, payment/wallet reconciliation, SMTP outbox, VV Admin dispatcher. Задать собственные имена/порты/volumes; проверить режим `--watch` там, где CLI по умолчанию однократный.
- [ ] Подготовить конфигурацию для getsgems.com и целевого сервера из VV-164. Настроить свой Steam callback, cookie/encryption secrets, SIH права/баланс, merchant для Gems, SMTP support@getsgems.com и site identity VV Admin. Значения секретов в план/Git не записывать.
- [ ] Подготовить Gems legal content и реквизиты для выбранного merchant: данные юрлица/документы в задаче не установлены, автоматически копировать Shards/Vault нельзя. Аналитические счётчики также нужны собственные; до их предоставления не включать донорские.
- [ ] CI: backend verify, PostgreSQL integration, OpenAPI freshness, frontend tests/typecheck/lint/build, browser fixtures и visual regression. Static Pages больше не production способ публикации commerce; его отключение выполнять при переходе на серверный deployment.
- [ ] Перед публикацией выполнить readiness: миграции с нуля, TLS/reverse proxy, same-origin API, реальный Steam login, catalog freshness каждой игры, работоспособность workers и наблюдаемые очереди. Money flags включать после проверки соответствующих зависимостей.
- [ ] Отдельно выполнить согласованную live-приёмку: top-up → подтверждённый credit; skin order по каждой игре и смешанный заказ → provider terminal status + DB hold/ledger + история; Steam → captured payment + fulfillment без wallet mutation. До этого не заявлять полную готовность платежей/выдачи.
- [ ] Recovery: остановка новых финансовых команд сохраняет чтение статусов/reconciliation принятых операций. Backup/restore проверяется для собственного Gems окружения; rollback не удаляет DB и не создаёт заново неизвестные операции.

**Готовность к релизу:** все три игры проходят цепочку catalogue → quote → wallet reserve → SIH correct appId → terminal settlement → UI history; реализованы VV-164 и уточнения; визуал принят по baseline; внешние результаты подтверждены раздельно от тестов.

## Порядок и внешние зависимости

Последовательность: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. Инфраструктурные файлы можно готовить после этапа 2, но запуск зависит от функциональной приёмки. Каждый этап завершать проверкой diff и отдельным тематическим коммитом только при наличии поручения на коммиты.

Решения пользователя уже получены: login/email для Steam и все три игры сразу. Дополнительных продуктовых вопросов для начала локальной реализации нет. Для live запуска остаются входные данные: merchant/callback для Gems, право использовать нужные SIH ключи и ассортимент, SMTP, реквизиты/legal документы, параметры VV Admin и фактический доступ к целевому серверу. Доступы из задачи — источник для защищённой настройки, не разрешение автоматически переносить реквизиты других магазинов.

## Что сделано в ходе исследования

Прочитаны frontend Gems, backend/frontend Shards, относящиеся к трём играм модули/тесты Vault; VV-164 получена через Linear MCP, комментариев нет. Открыта опубликованная главная Gems; выполнены 30 unit-тестов Gems и публичные read-only запросы Shards. Соседние проекты, серверы, Linear и product code не изменялись. Полная локальная browser/build проверка, серверный аудит Gems и настоящие provider acceptance остаются этапами реализации.

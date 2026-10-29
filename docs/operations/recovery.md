# Восстановление Gems

При инциденте выключить новые checkout/payments через Gems flags. Не удалять принятые платежи, fulfillment commands, outbox, quote snapshots или ключи идемпотентности. Reconciliation и чтение статусов должны продолжать работать.

При неизвестном результате сначала сверить provider customId / orderId и durable command. Не запускать повторную выдачу с новым customId. Fulfillment worker восстанавливает lease и продолжает ту же команду. Неподтверждённые и противоречивые результаты переходят на проверку.

До миграции сделать backup собственной Gems PostgreSQL, записать release SHA и журнал миграций. Периодически проверять восстановление в отдельную базу; восстановление поверх production не является тестом. Redis содержит очереди, durable команды/деньги хранятся в PostgreSQL.

Rollback приложения выполняется возвратом к предыдущему совместимому коду в `main` и штатным workflow с повторной сборкой. Compose использует собственный `build` каждого сервиса, фиксированных release image tags нет. Миграции не откатываются удалением таблиц. При изменении `DATA_ENCRYPTION_SECRET` старые trade credentials становятся нечитаемыми: ключ нужен для восстановления вместе с DB backup. Платёжные операции не переигрываются после restore до сверки с провайдером.

Persistent data: `/opt/gems-storefront/volumes/postgres` и `/opt/gems-storefront/volumes/redis`. Серверный env: `~/.envs/gems-storefront/.env` пользователя runner. Не удалять эти каталоги для исправления deploy; `docker compose down` не входит в workflow. Изменение `POSTGRES_PASSWORD` в env не меняет пароль уже созданной PostgreSQL-роли: ротация требует отдельного согласованного изменения БД и env.

Наблюдать: catalog_sync_runs и свежесть supplier_listings отдельно для каждой игры; fulfillment_commands (lease, next attempt, terminal state); payment sessions и outbox; wallet reconciliation mismatches; SMTP/VV Admin backlog. HTTP readiness сам по себе не доказывает работу worker.

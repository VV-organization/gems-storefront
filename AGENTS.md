# Gems commerce

- Общение и документы на русском. Реализовать `docs/superpowers/plans/2026-10-29-gems-commerce.md` в текущем checkout и ветке проекта.
- Сохранить дизайн frontend: CSS, assets, Commissioner, композицию, анимации и responsive. Разрешены изменения VV-164, реальные состояния и Steam login/email.
- Покупки CS2, Rust и TF2 только за Gems. 1 RUB = 2 Gems, целые минимальные единицы. Steam refill отдельный RUB flow без изменения Gems wallet.
- Backend Shards — основа; Vault — источник multi-game решений. Соседние проекты читать, не менять. Не переносить секреты, данные, .git или deployment конфигурацию.
- PostgreSQL authoritative; стабильные provider operation IDs, immutable snapshots, idempotency, inbox/outbox и reconciliation обязательны.
- Тестовые destructive DB операции только через GEMS_TEST_DATABASE_URL в локальную gems_test, принадлежащую gems_test.
- Node 24. Проверять unit/integration, OpenAPI, typecheck/lint/build, реальные browser flows и визуальный baseline.
- Не путать provider mock, checkout reachability и реальное зачисление/выдачу. Production credentials и платежи не имитировать.
- Не коммитить и не публиковать без отдельного поручения. Все существующие перемещения frontend сохранить.

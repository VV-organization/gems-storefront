# Gems

Сайт: https://vv-organization.github.io/gems-storefront/
Репозиторий: https://github.com/VV-organization/gems-storefront
Магазин скинов CS2 и пополнения Steam/Gems. **1 ₽ = 2 Gems.**

Структура Drops, технические сценарии Shards, самостоятельный визуал по Haunted Boulder City и Kstoimenov. Next.js 16 / React 19 / TypeScript. 68 предметов с исходными изображениями и provenance.

## Запуск
Node.js 24.
```sh
npm ci
npm run dev
```
Локальный адрес: http://127.0.0.1:5201.

## Проверки и сборка
```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run build:pages
```
Статическая сборка — out-pages, basePath /gems-storefront. GitHub Actions публикует ветку codex/gems-storefront в Pages. Серверная версия содержит проверку публичного Steam-профиля; статическая сообщает о недоступности проверки. APP_ORIGIN для серверной версии задаётся адресом сайта.

## Реализовано
Главная, каталог, 68 товарных страниц, quick view, корзина, локальный кабинет, избранное, фильтры, сортировка, сравнение, подбор скинов по рублёвому бюджету, Steam/баланс, конвертер, FAQ. Корзина сохраняется на устройстве и не дублирует предметы. Уведомление после добавления доступно внутри native dialog.

## Границы
Это самостоятельный интерфейс с датированным каталогом. Текущие остатки не подтверждены. Реальные платежи, Steam OpenID и выдача скинов требуют серверных контрактов и доступов. Финансовые операции недоступны и не создают фиктивные зачисления/заказы/коды. Локальный кабинет не означает авторизацию Steam.

Документы: PROJECT.md, project-prompts.md, DESIGN_DIRECTION.md, REQUIREMENTS_AUDIT.md. Полные исторические задания остаются в локальном архиве docs/source-requirements и не включаются в публичный репозиторий.

## Источники
- https://www.hauntedbouldercity.com/ — измеренная палитра, композиции и атмосфера.
- https://kstoimenov.com/ — контраст типографики и интерактивные сервисные строки.
- Изображения/данные предметов — каталог Drops/Shards; source-поля сохранены в src/data/catalog.json.
- Фон карьера создан встроенным imagegen; prompt в reference-evidence/hero-prompt.txt.
- Commissioner Variable — единственная гарнитура сайта: заголовки, интерфейс, формы и цены. Локальная загрузка; лицензия SIL OFL в public/fonts/Commissioner-OFL.txt.

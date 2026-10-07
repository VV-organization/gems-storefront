# Gems — правила проекта
- Общение и документы на русском; код и identifiers на английском.
- Выполнить все семь этапов project-prompts.md. Реализация уже поручена пользователем; повторные согласования не нужны.
- Структура и технические требования Drops и Shards. Соседние проекты читать, не менять; секреты, .git, .env и конфигурацию публикации не переносить.
- Визуал только по hauntedbouldercity.com и kstoimenov.com. Старые home, CSS и визуальные эффекты не переиспользовать. Для каждого блока фиксировать источник.
- Заголовки блоков вне hero — короткие, в одну строку, без принудительных переносов. Заголовки вне hero одного размера на каждом breakpoint и выровнены влево. Все заголовки без рукописных/курсивных шрифтов; без декоративных мелких надзаголовков вроде «01 / ПОПОЛНЕНИЕ».
- Единственная гарнитура сайта — локальный Commissioner Variable: заголовки, интерфейс, формы, цены, модальные окна. Не подключать прежние или дополнительные шрифты без прямого запроса пользователя.
- Название и валюта Gems. 1 ₽ = 2 Gems. Денежные расчёты в целых минимальных единицах. Рублёвые цены исходного снимка сохранять.
- Новые GitHub-репозитории public в VV-organization, если пользователь явно не просит иначе.
- Полный путь покупки обязателен: добавление → нижнее уведомление со ссылкой и закрытием → корзина → наличие товара. Уведомление внутри native dialog top layer при quick view, aria-live.
- После добавления основное действие товара или набора — работающая ссылка «Перейти в корзину». Никаких дублей или мёртвых «Уже в корзине».
- Проверять reload, mobile, клавиатуру, Escape, возврат фокуса и существующую корзину.
- В каждом ряду товарных карточек выравнивать названия, характеристики, цены и действия по общим строкам независимо от длины названия и состояния «Перейти в корзину»; проверять desktop и mobile.
- Не выдумывать наличие, скидки, отзывы, финансовые успехи, контакты и выдачу. Локальный кабинет не является Steam-сессией.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

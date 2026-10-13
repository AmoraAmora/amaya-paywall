# Amaya Paywall

[![CI](https://github.com/AmoraAmora/amaya-paywall/actions/workflows/ci.yml/badge.svg)](https://github.com/AmoraAmora/amaya-paywall/actions/workflows/ci.yml)

Мобильный paywall для детской игры: два тарифа, тестовая покупка с записью в БД, восстановление покупок.

- **Сайт:** https://amaya-paywall-smoky.vercel.app
- **Макет:** [Figma](https://www.figma.com/design/Mg8uTnFHOGb373uQIrOxtr/amaya-test-task-UI). Пять экранов: default, loading, error, purchasing, success
- **Состояния на живом сайте:** `?simulate=slow` (загрузка), `?simulate=error` (ошибка тарифов), `?simulate=purchase-error` (ошибка покупки)

## Запуск локально

```bash
npm install
cp .env.example .env    # вписать DATABASE_URL (Neon). Без него dev-сервер хранит покупки в памяти
npm run db:migrate      # создать таблицу purchases
npm run dev             # http://localhost:3000
```

Проверки: `npm run typecheck` · `npm test` (API и юнит, Vitest) · `npm run test:e2e` (Playwright, 390×844). Тесты не трогают настоящую БД. Сверка с Figma: `npm run pixel:capture && npm run pixel:compare` (нужны PNG экранов в `figma-screens/Paywall/`).

## Где что лежит

| | |
|---|---|
| **Frontend** | `app/pages/index.vue` (экран и все состояния), `app/components/` (карточка тарифа, кнопка, маскот, скелетон, ошибка), `app/assets/css/tokens.css` (токены 1:1 с переменными Figma) |
| **Server routes** | `server/api/offers.get.ts`, `server/api/purchase.post.ts`, `server/api/purchases.get.ts` (restore). Тарифы и цены только на сервере: `server/data/offers.ts` |
| **БД** | `server/utils/purchase-repo.ts` (Postgres через Neon и in-memory для тестов), миграции в `server/db/migrations/` |
| **Тесты** | `test/` (API и юнит), `e2e/` (браузер), `.github/workflows/ci.yml` |

**Сервер.** Клиент передаёт только `offerId` и `deviceId`, цена берётся с сервера. Тело запроса валидирует zod (400 / 422). Покупка идемпотентна: клиент шлёт `Idempotency-Key`, повтор с тем же ключом возвращает ту же покупку, а уникальный индекс в БД не даёт создать дубль даже при одновременных запросах. Поэтому POST можно безопасно ретраить при плохой сети в webview.

## Платформа и БД

- **Vercel.** Nuxt server routes деплоятся как serverless-функции без настройки, есть preview на каждый коммит. В Deployment Checks подключён CI: прод обновляется только при зелёных тестах.
- **Neon (Postgres).** Бесплатный, работает с serverless (HTTP-драйвер без пула соединений), обычный SQL без привязки к вендору. SQLite на Vercel не подходит: у функций нет постоянного диска.

## AI-инструменты

Использовался **Claude Code**: код, вёрстка, тесты и макет в Figma (через Figma MCP). Решения по дизайну (стиль, палитра, шрифт Rubik, маскот с настроением под каждое состояние, тексты) и все правки принимала я. Проверила сама: макет и экраны в Figma, работу сайта локально и на проде (покупка, restore, ошибки, загрузка), записи в Neon, вид на телефоне и на широких экранах.

Pixel perfect проверялся автоматически: скриншоты браузера сравниваются с PNG из Figma, совпадение **99.3–99.7%** на всех пяти экранах (остаток приходится на сглаживание шрифта). По ходу тесты нашли недостаточный контраст `text-muted` (WCAG AA). Цвет исправлен в коде и в Figma.

## Что упрощено

- `deviceId` — случайный UUID в localStorage. В реальном приложении id пользователя передавал бы хост через webview-мост.
- Тарифы захардкожены на сервере, а не лежат в БД.
- Restore ищет покупки по устройству, без аккаунтов. Так и задумано в ТЗ (без авторизации).

## Если бы было ещё 2 часа

1. **Мост с нативным приложением:** закрытие paywall и `userId` от хоста вместо localStorage, события аналитики (`paywall_view`, `plan_select`, `purchase_success`).
2. **Визуальная регрессия в CI:** сейчас сверка с Figma запускается локально, а нужно, чтобы она падала в CI при расхождении больше 1%.
3. **Rate limit на `POST /api/purchase`** и логирование ошибок (Sentry).
4. **Планшетная раскладка:** на высоких экранах ограничить высоту колонки, чтобы кнопка не уезжала далеко от карточек.
5. **Локализация** текстов и валюты.

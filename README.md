# Omni Fast

Мобильный PWA-клиент поверх [omni.top-academy.ru](https://omni.top-academy.ru) с серверной прокладкой.

## Что умеет

- Нормальный mobile-first UI для отметки пар
- PWA (добавить на домашний экран)
- Прокси к Omni с кэшем в D1: когда оригинал тупит — отдаём последнее сохранённое
- Очередь записи (`set-was` / оценки): сразу пробуем отправить, иначе копим и дожимаем
- Повторная проверка через ~2 часа (cron), потому что в Omni отметки иногда слетают
- Своя сессия на 30 дней (HttpOnly cookie), Omni PHPSESSID живёт на сервере

## Стек

- React + Vite + PWA
- Cloudflare Worker (Hono) + D1 + KV

## Локальный запуск

```bash
cp .dev.vars.example .dev.vars
# пропиши SESSION_SECRET

npm install
npx wrangler d1 migrations apply omni-fast --local
```

Терминал 1 — API:

```bash
npm run dev:worker
```

Терминал 2 — UI:

```bash
npm run dev
```

Открой http://localhost:5173

## Деплой

1. Создай D1 и KV в Cloudflare, подставь id в `wrangler.jsonc`
2. `npx wrangler secret put SESSION_SECRET`
3. `npm run deploy`

## Безопасность

Не храни пароли Omni в репозитории. Логин только через форму / env на твоей машине.

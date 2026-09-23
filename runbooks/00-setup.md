# 00 · Підготовка

## Навіщо

Підготуємо ключі й середовище до заняття. **Репозиторій клонуємо разом на воркшопі.** До цього встанови Node.js і Git та створи власного Telegram-бота.

1. Перевір `node --version`, `npm --version`, `git --version`. Вимога зафіксованого Flue: Node 22.19+ у гілці 22 або 24.11+; у перевірках воркшопу — Node 26.9.0. Інструкція встановлення Node для твоєї ОС є у [підготовці першого дня](https://github.com/genkovich/harness-workshop/blob/start/runbooks/00-setup.md).
2. Відкрий [@BotFather](https://t.me/BotFather), надішли `/newbot`, обери назву й username та збережи токен. Не публікуй його. [Офіційна інструкція Telegram](https://core.telegram.org/bots/tutorial#obtain-your-bot-token).
3. Підготуй API-ключ провайдера моделі. Приклад за замовчуванням — Gemini через [Google AI Studio](https://aistudio.google.com/apikey). Доступність безкоштовної квоти залежить від облікового запису; безлімітної роботи не обіцяємо. Можна використати свій OpenAI, Anthropic, xAI або OpenRouter. Назва моделі має бути в каталозі встановленого Flue/Pi.

На початку воркшопу:

```bash
git clone --branch start https://github.com/genkovich/harness-workshop-day2.git
cd harness-workshop-day2
npm ci
node -e "require('node:fs').copyFileSync('.env.example', '.env', require('node:fs').constants.COPYFILE_EXCL)"
```

Команда копіювання працює в терміналах трьох ОС і не затирає наявний .env. Якщо він уже є, відкрий його.

У `.env` заповни TELEGRAM_BOT_TOKEN та ключ **одного** провайдера. MODEL — рядок виду provider/model-id, а не назва npm-пакета:

| Провайдер | Приклад MODEL | Ключ |
|---|---|---|
| Google | `google/gemini-2.5-flash` | `GEMINI_API_KEY` |
| OpenAI | `openai/gpt-4.1-mini` | `OPENAI_API_KEY` |
| Anthropic | `anthropic/claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| OpenRouter | `openrouter/openai/gpt-4.1-mini` | `OPENROUTER_API_KEY` |
| xAI | `xai/grok-4.3` | `XAI_API_KEY` |

Оплата API й підписка на чат — різні речі. Якщо отримуєш Unknown model, перевір точний id у каталозі своєї версії; не підставляй назву навмання. [Моделі Flue](https://flueframework.com/docs/guide/models/).

## Пакети коротко

- `@flue/runtime` виконує цикл агента, виклики тулів і веде сесію. Це шар навколо моделі.
- `@flue/cli` дає команду для першого запиту з термінала.
- `grammy` приймає й надсилає повідомлення Telegram.
- `valibot` описує та перевіряє дані — подібна задача до Zod першого дня.
- `tsx` запускає TypeScript, `typescript` перевіряє типи, `@types/node` описує API Node для перевірки типів.

## Перевірка

```bash
npm start
npm run typecheck
npm test -- --test-name-pattern "^00 "
```

Очікуємо повідомлення про підготовку, перевірені типи й успішний тест ранбуків. Це ще не перевірка API або Telegram. Її виконуємо на етапах 01 і 02.

Якщо репозиторій приватний, до клонування організатор має надати доступ твоєму GitHub-акаунту. Помилка Repository not found за правильного URL часто означає відсутність доступу.

Далі: [01 · модель](01-model.md).

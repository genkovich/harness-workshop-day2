# Harness Workshop · день 2

Окремий Telegram-бот на Flue.

```bash
git clone --branch start https://github.com/genkovich/harness-workshop-day2.git
cd harness-workshop-day2
npm ci
cp .env.example .env
# Заповни TELEGRAM_BOT_TOKEN та GEMINI_API_KEY.
npm run bot
```

Гілка `start` — заготовка; `main` — готове рішення.

Node 22.19 або 24.11+. Перевірки без ключів: `npm run check`.

[Практика](RUNBOOK.md). [День 1](https://github.com/genkovich/harness-workshop).

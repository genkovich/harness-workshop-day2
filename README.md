# Harness Workshop · день 2

Учора ми написали харнес агента самі. Сьогодні той самий агент живе в Telegram, а харнес бере [Flue](https://flueframework.com/). Будуємо бота для нотаток: він запамʼятовує, шукає, видаляє лише для власника і складає стендап.

[Усі ранбуки](runbooks/README.md) · [Підготовка](runbooks/00-setup.md) · [Тести](tests/workshop.test.ts) · [Перший день](https://github.com/genkovich/harness-workshop)

Головне пояснення, що саме Flue забирає на себе і що лишається нам, у [runbooks/README.md](runbooks/README.md).

## Початок на воркшопі

До заняття створи бота в @BotFather і ключ моделі за [інструкцією підготовки](runbooks/00-setup.md). Репозиторій клонуємо разом:

```bash
git clone --branch start https://github.com/genkovich/harness-workshop-day2.git
cd harness-workshop-day2
npm ci
git switch -c work-01
```

`npm ci` створить `.env` з `.env.example`. Заповни `MODEL`, ключ провайдера і `TELEGRAM_BOT_TOKEN`, потім `npm run setup:check`.

## Гілки

`start` містить залежності, ранбуки, тести і готовий `src/notes.ts`. `step-01-model` … `step-06-skill` це результат кожного етапу. `main` = готове рішення, те саме, що `step-06-skill`. Ранбуки й тести однакові в усіх гілках.

## Команди

| Команда | Що робить |
|---|---|
| `npm run ask -- "текст"` | Одне повідомлення агенту з термінала, розмова `terminal` |
| `npm run bot` | Запустити Telegram-бота |
| `npm run check` | Перевірити типи |
| `npm test` | Тести без мережі: справжній цикл Flue зі скриптованою моделлю |
| `npm run setup:check` | Живий запит до Telegram і до моделі |

Коментарі в коді українською, інструкції для моделі англійською. `.env`, `bot.db` і `notes.json` у Git не потрапляють.

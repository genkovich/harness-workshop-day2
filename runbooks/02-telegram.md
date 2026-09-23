# 02. Telegram

[Усі етапи](README.md) · [Попередній](01-model.md) · [Наступний](03-tools.md)

**Перед початком:** код із гілки `step-01-model`. **Результат етапу:** `step-02-telegram`. Змінюємо лише `src/`.

## Що робимо й навіщо

Агент уже відповідає і памʼятає розмову, але тільки в терміналі. Переносимо його в Telegram. Головне рішення етапу вміщається в один рядок: **id чату в Telegram стає id агента**. Тоді кожен, хто пише боту, отримує свою розмову й свою історію, і для цього не треба писати жодного коду памʼяті.

## Чого бракує зараз і що зміниться

- `src/chat.ts`: місток між чатом і Flue. Отримує id чату й текст, повертає відповідь агента. Цей файл пишемо руками, бо в ньому вся суть етапу.
- `src/bot.ts`: обвʼязка Telegram на бібліотеці grammY. Вона однакова для будь-якого бота, тому копіюємо її цілком і розбираємо по частинах.
- `src/agent.ts` не змінюється. Той самий агент тепер працює і в терміналі, і в Telegram.

## Маленькі зміни

### 1. Місток: `src/chat.ts`

Створи файл:

```ts
import { init } from '@flue/runtime';
import { Assistant } from './agent.ts';
```

Далі одна функція:

```ts
// Одна розмова = один агент. Id чату стає id агента, тож історія в кожного чату своя.
export async function askAgent(chatId: string, text: string) {
  const agent = init(Assistant, { id: chatId });
  const receipt = await agent.dispatch(text);
  const reply = await agent.read(receipt);
```

`init(Assistant, { id })` дає «адресу» конкретної розмови. Сам по собі він нічого не створює: розмова зʼявиться при першому повідомленні, а наступні з тим самим id її продовжать.

`dispatch` передає повідомлення в чергу агента і одразу повертає квитанцію (`receipt`). Відповіді ще немає: Flue тільки прийняв роботу. `read(receipt)` чекає, доки агент закінчить саме цю роботу, і повертає відповідь. Учора `runAgent` робив усе одним викликом; тут прийом і читання розділені, бо в реальному сервісі повідомлення може прийти вебхуком, а відповідь забрати інший процес.

Заверши функцію:

```ts
  if (!reply.text.trim()) {
    throw new Error('Модель не повернула текст.');
  }
  return reply.text;
}
```

Telegram не приймає порожнє повідомлення. Краще явна помилка, ніж бот, який мовчки нічого не відповів.

### 2. Бот: `src/bot.ts`

Створи файл і скопіюй код з розділу [«Готовий код»](#готовий-код) цілком. Що в ньому відбувається:

```ts
await start({ agents: [Assistant], db: sqlite('./bot.db') });
```

`flue run` запускав Flue сам. Бот це наш власний процес, тож Flue стартуємо явно. `sqlite('./bot.db')` каже, де зберігати історію розмов. Без цього параметра історія жила б лише в памʼяті і зникала б при перезапуску.

```ts
bot.command('start', async (ctx) => {
  console.log('Chat id:', ctx.chat.id);
  await ctx.reply(`Привіт! Твій chat id: ${ctx.chat.id}`);
});
```

Команда `/start` показує id чату. Він знадобиться на етапі 04, щоб призначити власника бота.

```ts
bot.on('message:text', async (ctx) => {
  try {
    const answer = await askAgent(String(ctx.chat.id), ctx.message.text);
```

Кожне текстове повідомлення йде в `askAgent` разом з id свого чату. Id бере код з даних Telegram, модель його не вибирає. Далі відповідь надсилається шматками по 4000 символів, бо Telegram не приймає довші повідомлення. Помилку друкуємо в терміналі, а користувачу коротко пишемо, що не вийшло.

```ts
process.once('SIGINT', () => bot.stop());
```

Коли зупиняєш бота через Ctrl+C, `bot.stop()` встигає сказати Telegram, які повідомлення вже оброблено. Без цього після перезапуску Telegram надішле останнє повідомлення ще раз, і агент, наприклад, збереже ту саму нотатку двічі. Бота на практиці ти перезапускатимеш після кожної зміни коду.

### 3. Запуск

```bash
npm run check
npm run bot
```

У терміналі: «Бот @твій_бот запущений». Відкрий свого бота в Telegram і надішли `/start`, потім «Привіт, мене звати Оля» і «Як мене звати?».

Попроси сусіда написати твоєму боту «Як мене звати?». Його чат має інший id, тож агент його імені не знає і твого не назве.

Розмова в терміналі (`npm run ask`) і розмова в Telegram не бачать одна одну: перша зберігається в `node_modules/.cache/flue/run.db`, друга в `bot.db`.

У груповому чаті id один на всіх учасників, тож і памʼять у групі буде спільна. Id і є межею памʼяті.

## Перевірка

```bash
npm run check
npm test -- --test-name-pattern "^(00|01|02) "
```

**Автоматична перевірка:** 5 тестів без мережі й без Telegram. Вони викликають `askAgent` з двома різними id і дивляться, що розмови не змішуються, а порожня відповідь моделі стає помилкою.

**Очікуємо вручну:** бот відповідає в Telegram, памʼятає імʼя в межах свого чату і не знає його в чужому.

**Якщо не так:**

- `Заповни TELEGRAM_BOT_TOKEN у .env`: токен порожній.
- `409 Conflict` від Telegram: бот уже запущений в іншому терміналі. Зупини зайвий процес.
- Бот мовчить: подивись термінал, там причина помилки. Часто це квота моделі.

**Збережи свою зміну:**

```bash
git add src
git diff --cached
git commit -m "Етап 02: Telegram"
```

## Якщо не встиг: готова гілка

```bash
git add src
git diff --cached --quiet || git commit -m "Моя спроба етапу 02"
git fetch origin
git switch -c work-03 origin/step-02-telegram
npm run check
```

Твій коміт лишився в попередній гілці. `.env`, `bot.db` і `node_modules` лишаються на місці.

Якщо встиг сам, продовжуй у своїй гілці з [етапу 03](03-tools.md).

## Готовий код

Повний вміст файлів, які змінились на цьому етапі. Решта файлів лишається як була.

<details>
<summary>src/chat.ts</summary>

```ts
import { init } from '@flue/runtime';
import { Assistant } from './agent.ts';

// Одна розмова = один агент. Id чату стає id агента, тож історія в кожного чату своя.
export async function askAgent(chatId: string, text: string) {
  const agent = init(Assistant, { id: chatId });
  const receipt = await agent.dispatch(text);
  const reply = await agent.read(receipt);

  if (!reply.text.trim()) {
    throw new Error('Модель не повернула текст.');
  }
  return reply.text;
}
```

</details>

<details>
<summary>src/bot.ts</summary>

```ts
import { Bot } from 'grammy';
import { sqlite, start } from '@flue/runtime/node';
import { Assistant } from './agent.ts';
import { askAgent } from './chat.ts';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('Заповни TELEGRAM_BOT_TOKEN у .env.');
}

// Запускаємо Flue у цьому процесі. Історію розмов він зберігає в bot.db.
await start({ agents: [Assistant], db: sqlite('./bot.db') });

const bot = new Bot(token);
const telegramLimit = 4_000; // Telegram приймає до 4096 символів в одному повідомленні.

bot.command('start', async (ctx) => {
  console.log('Chat id:', ctx.chat.id);
  await ctx.reply(`Привіт! Твій chat id: ${ctx.chat.id}`);
});

bot.on('message:text', async (ctx) => {
  try {
    const answer = await askAgent(String(ctx.chat.id), ctx.message.text);
    for (let offset = 0; offset < answer.length; offset += telegramLimit) {
      await ctx.reply(answer.slice(offset, offset + telegramLimit));
    }
  } catch (error) {
    console.error('Агент не відповів:', error instanceof Error ? error.message : error);
    await ctx.reply('Не вийшло відповісти. Причина в терміналі бота.');
  }
});

bot.catch((error) => {
  console.error('Помилка Telegram:', error.error);
});

// Ctrl+C: спершу чемно зупиняємо бота, щоб Telegram не надіслав останнє повідомлення вдруге.
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());

await bot.start({
  // onStart спрацьовує, коли Telegram уже прийняв токен.
  onStart: (me) => console.log(`Бот @${me.username} запущений. Напиши йому в Telegram. Зупинити: Ctrl+C.`),
});
```

</details>

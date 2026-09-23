# 02 · Повідомлення з Telegram

## Навіщо

Повідомлення має дійти до агента й повернутися саме у свій чат. Окремий місток дозволить перевірити цей шлях без Telegram та платного API.

Початок: `step-01-model`. Готовий результат: `step-02-telegram`.

## Як працює

Спочатку створюємо `src/bridge.ts`. `dispatch` відправляє повідомлення та повертає квитанцію, `read` чекає відповідь саме за нею. Тип `Receipt` — назва невідомого наперед типу квитанції: ми не заглядаємо всередину, лише передаємо той самий обʼєкт.

Потім додаємо `src/bot.ts`. `Bot` із grammY отримує оновлення Telegram. `start` запускає Flue; `sqlite` задає сховище runtime. `init(Assistant, { id })` звертається до агента конкретного чату. `chatId` надходить із Telegram, а не з тексту повідомлення.

У цьому прикладі обробляємо тільки приватні чати. `try/catch` повідомляє про збій. Він не повторює весь запит автоматично: попередня дія могла вже виконатися. `finally` закриває runtime при завершенні. Наявність bot.db — механізм Flue; власну систему памʼяті тут не пишемо.

## Невеликі зміни

### `src/bridge.ts`

1. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
// Receipt — квитанція Flue: повʼязуємо відправлення з його відповіддю.
type AgentHandle<Receipt> = {
  dispatch(text: string): Promise<Receipt>;
  read(receipt: Receipt): Promise<{ text: string }>;
};
```

2. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
export async function answer<Receipt>(
  chatId: string,
  text: string,
  makeHandle: (id: string) => AgentHandle<Receipt>,
) {
  const agent = makeHandle(chatId);
  const receipt = await agent.dispatch(text);
  const reply = await agent.read(receipt);
```

3. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
  if (!reply.text.trim()) {
    throw new Error('Модель не повернула текст. Перевір журнал запиту.');
  }
```

4. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
  return reply.text;
}
```

### `src/bot.ts`

1. Додай імпорти та оголошення, які використовуємо нижче.

```ts
import { Bot } from 'grammy';
import { init } from '@flue/runtime';
import { sqlite, start } from '@flue/runtime/node';
import { Assistant } from './agent.ts';
import { answer } from './bridge.ts';
```

2. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('Заповни TELEGRAM_BOT_TOKEN у .env.');
}
```

3. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
// Ідентичність агента визначає чат; історію зберігає runtime.
const runtime = await start({ agents: [Assistant], db: sqlite('./bot.db') });
const bot = new Bot(token);
const replyCharacters = 4_000; // Залишаємо запас до обмеження Telegram.
```

4. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
bot.on('message:text', async (ctx) => {
  if (ctx.chat.type !== 'private') {
    return;
  }
```

5. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
  const chatId = String(ctx.chat.id);
  console.log('Ідентифікатор чату:', chatId);
  if (ctx.message.text === '/start') {
    await ctx.reply('Готовий. Ідентифікатор чату видно у твоєму терміналі.');
    return;
  }
```

6. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
  try {
    const text = await answer(chatId, ctx.message.text, (id) => {
      return init(Assistant, { id });
    });
```

7. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
    // Довгу відповідь надсилаємо частинами, а не мовчки обрізаємо.
    for (let offset = 0; offset < text.length; offset += replyCharacters) {
      await ctx.reply(text.slice(offset, offset + replyCharacters));
    }
  } catch (error) {
    console.error('Запит не завершився:', error instanceof Error ? error.message : error);
    await ctx.reply('Запит не завершився. Подивись причину в терміналі. Не повторюй дію запису, доки не перевіриш результат.');
  }
});
```

8. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
bot.catch((error) => {
  console.error('Помилка Telegram:', error.error);
});
```

9. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    if (bot.isRunning()) {
      void bot.stop();
    }
  });
}
```

10. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
try {
  await bot.start();
} finally {
  await runtime.stop();
}
```

## Перевірка

```bash
npm run typecheck
npm test -- --test-name-pattern "^(00|01|02) "
npm run bot
```

Надішли /start, потім «Привіт» своєму боту. У терміналі видно chat id, у Telegram — відповідь. Інший чат отримує іншу ідентичність агента.

Якщо тест падає, дивись назву перевірки й фактичний результат. Перевірка типів виявляє помилки TypeScript; локальні тести не доводять доступність провайдера. Для помилки API перевір ключ, точну назву моделі та відповідь сервісу в терміналі.

## Готовий код етапу

Це повний стан змінених файлів. Інші файли залишаються з попереднього етапу.

### `src/bridge.ts`

```ts
// Receipt — квитанція Flue: повʼязуємо відправлення з його відповіддю.
type AgentHandle<Receipt> = {
  dispatch(text: string): Promise<Receipt>;
  read(receipt: Receipt): Promise<{ text: string }>;
};

export async function answer<Receipt>(
  chatId: string,
  text: string,
  makeHandle: (id: string) => AgentHandle<Receipt>,
) {
  const agent = makeHandle(chatId);
  const receipt = await agent.dispatch(text);
  const reply = await agent.read(receipt);

  if (!reply.text.trim()) {
    throw new Error('Модель не повернула текст. Перевір журнал запиту.');
  }

  return reply.text;
}
```

### `src/bot.ts`

```ts
import { Bot } from 'grammy';
import { init } from '@flue/runtime';
import { sqlite, start } from '@flue/runtime/node';
import { Assistant } from './agent.ts';
import { answer } from './bridge.ts';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('Заповни TELEGRAM_BOT_TOKEN у .env.');
}

// Ідентичність агента визначає чат; історію зберігає runtime.
const runtime = await start({ agents: [Assistant], db: sqlite('./bot.db') });
const bot = new Bot(token);
const replyCharacters = 4_000; // Залишаємо запас до обмеження Telegram.

bot.on('message:text', async (ctx) => {
  if (ctx.chat.type !== 'private') {
    return;
  }

  const chatId = String(ctx.chat.id);
  console.log('Ідентифікатор чату:', chatId);
  if (ctx.message.text === '/start') {
    await ctx.reply('Готовий. Ідентифікатор чату видно у твоєму терміналі.');
    return;
  }

  try {
    const text = await answer(chatId, ctx.message.text, (id) => {
      return init(Assistant, { id });
    });

    // Довгу відповідь надсилаємо частинами, а не мовчки обрізаємо.
    for (let offset = 0; offset < text.length; offset += replyCharacters) {
      await ctx.reply(text.slice(offset, offset + replyCharacters));
    }
  } catch (error) {
    console.error('Запит не завершився:', error instanceof Error ? error.message : error);
    await ctx.reply('Запит не завершився. Подивись причину в терміналі. Не повторюй дію запису, доки не перевіриш результат.');
  }
});

bot.catch((error) => {
  console.error('Помилка Telegram:', error.error);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    if (bot.isRunning()) {
      void bot.stop();
    }
  });
}

try {
  await bot.start();
} finally {
  await runtime.stop();
}
```

## Якщо не встигаєш

```bash
git stash push -u -m "my-day2-progress"
git switch step-02-telegram
```

Першою командою зберігаєш власні зміни окремо, включно з новими src-файлами. `.env`, база й нотатки ігноруються Git і залишаються на місці. Не застосовуй stash поверх готової гілки автоматично.

Далі: [03 · Тули для нотаток](03-tools.md).

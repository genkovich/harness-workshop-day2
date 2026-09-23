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

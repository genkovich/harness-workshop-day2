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

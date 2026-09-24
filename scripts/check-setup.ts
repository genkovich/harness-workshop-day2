// Перевірка перед практикою: токен Telegram, ключ моделі й виклик тула через Flue.
// Робить один запит до Telegram і один-два запити до моделі.
import { init, useModel, useTool, useResponseFinish, defineTool } from '@flue/runtime';
import { start } from '@flue/runtime/node';
import * as v from 'valibot';
import { DEFAULT_MODEL } from '../src/models.ts';

const model = process.env.MODEL || DEFAULT_MODEL;
let ok = true;

async function checkTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN порожній. Візьми токен у @BotFather і встав у .env.');
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram не прийняв токен: ${data.description}`);
  }
  console.log(`Telegram: бот @${data.result.username} на звʼязку.`);
}

let toolCalled = false;

function SetupCheck() {
  useModel(model);
  useTool(defineTool({
    name: 'ready',
    description: 'Connection check. Has no side effects.',
    input: v.object({}),
    run: () => 'ok',
  }));
  useResponseFinish(({ response }) => {
    toolCalled = response.toolCalls.some((call) => call.tool === 'ready' && !call.isError);
  });
  return 'Call the ready tool once, then answer with one word: done.';
}

async function checkModel() {
  const runtime = await start({ agents: [SetupCheck] });
  try {
    const agent = init(SetupCheck);
    await agent.read(await agent.dispatch('Check the connection.'));
  } finally {
    await runtime.stop();
  }
  if (!toolCalled) {
    throw new Error('Модель відповіла, але не викликала тул. Спробуй іншу модель у MODEL.');
  }
  console.log(`Модель ${model}: ключ працює, тул викликано.`);
}

for (const check of [checkTelegram, checkModel]) {
  try {
    await check();
  } catch (error) {
    ok = false;
    console.error('Не пройшло:', error instanceof Error ? error.message : error);
  }
}

if (ok) {
  console.log('Усе готово до практики.');
} else {
  console.error('Перевір .env. Назва моделі має формат provider/model-id, ключ має бути від цього провайдера.');
  process.exitCode = 1;
}

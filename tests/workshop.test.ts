import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { script, requests, toolNames, messagesText, send, load } from './model.ts';

// Номер на початку назви = етап. Ранні гілки запускають лише свої етапи:
// npm test -- --test-name-pattern "^(00|01) "
// Модулі src імпортуємо всередині тестів: на ранніх гілках пізніх файлів ще немає.

function useTemporaryNotes(t: TestContext) {
  const previous = process.env.NOTES_FILE;
  const dir = mkdtemp(join(tmpdir(), 'day2-'));
  const file = dir.then((path) => {
    process.env.NOTES_FILE = join(path, 'notes.json');
    return process.env.NOTES_FILE;
  });
  t.after(async () => {
    process.env.NOTES_FILE = previous;
    if (previous === undefined) delete process.env.NOTES_FILE;
    await rm(await dir, { recursive: true, force: true });
  });
  return file;
}

function useOwner(t: TestContext, chatId: string | undefined) {
  const previous = process.env.OWNER_CHAT_ID;
  if (chatId === undefined) delete process.env.OWNER_CHAT_ID;
  else process.env.OWNER_CHAT_ID = chatId;
  t.after(() => {
    if (previous === undefined) delete process.env.OWNER_CHAT_ID;
    else process.env.OWNER_CHAT_ID = previous;
  });
}

async function savedNotes(file: string) {
  return JSON.parse(await readFile(file, 'utf8'));
}

test('00 Підготовка: усі ранбуки на місці в кожній гілці', async () => {
  const names = ['README', '00-setup', '01-model', '02-telegram', '03-tools', '04-permissions', '05-feedback', '06-skill'];
  for (const name of names) {
    const text = await readFile(new URL(`../runbooks/${name}.md`, import.meta.url), 'utf8');
    assert.ok(text.length > 200, `${name}.md порожній`);
  }
});

test('01 Агент: Flue повертає відповідь моделі', async () => {
  script({ text: 'Привіт!' });
  const reply = await send('agent-1', 'Привіт');
  assert.equal(reply.text, 'Привіт!');
  assert.match(String(requests[0].systemPrompt), /Ukrainian/);
});

test('01 Памʼять: той самий id бачить попередні повідомлення, інший id не бачить', async () => {
  script({ text: 'Запамʼятав.' }, { text: 'Тебе звати Оля.' }, { text: 'Не знаю.' });
  await send('memory-1', 'Мене звати Оля');
  await send('memory-1', 'Як мене звати?');
  assert.match(messagesText(1), /Мене звати Оля/);

  await send('memory-2', 'Як мене звати?');
  assert.doesNotMatch(messagesText(2), /Оля/);
});

test('02 Telegram: askAgent веде кожен чат окремою розмовою', async () => {
  const { askAgent } = await load('chat');
  script({ text: 'Відповідь для 42' }, { text: 'Відповідь для 7' });
  assert.equal(await askAgent('42', 'Я з чату 42'), 'Відповідь для 42');
  assert.equal(await askAgent('7', 'Я з чату 7'), 'Відповідь для 7');
  assert.doesNotMatch(messagesText(1), /чату 42/);
});

test('02 Помилка: порожня відповідь моделі не стає успіхом', async () => {
  const { askAgent } = await load('chat');
  script({ text: '' });
  await assert.rejects(() => askAgent('empty', 'Привіт'), /не повернула текст/);
});

test('03 Нотатки: функції зберігають і шукають лише у своєму чаті', async (t) => {
  await useTemporaryNotes(t);
  const { saveNote, searchNotes, readNotes } = await load('notes');
  assert.deepEqual(readNotes(), []);
  saveNote('42', '  Зустріч із командою  ');
  saveNote('7', 'Зустріч із клієнтом');
  assert.equal(searchNotes('42', 'ЗУСТРІЧ')[0].text, 'Зустріч із командою');
  assert.equal(searchNotes('42', 'клієнтом').length, 0);
  assert.equal(searchNotes('42', '').length, 1);
  assert.ok(!Number.isNaN(Date.parse(readNotes()[0].createdAt)));
});

test('03 Тул: модель просить saveNote, Flue виконує його з chatId від коду', async (t) => {
  const file = await useTemporaryNotes(t);
  script(
    { tool: 'saveNote', input: { text: 'Купити молоко' } },
    { text: 'Зберіг.' },
  );
  const reply = await send('42', 'Запамʼятай: купити молоко');
  assert.equal(reply.text, 'Зберіг.');
  assert.deepEqual(toolNames(0).sort(), ['saveNote', 'searchNotes']);
  const notes = await savedNotes(file);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].chatId, '42');
  // Результат тула повернувся моделі в наступному запиті.
  assert.match(messagesText(1), /Купити молоко/);
});

test('03 Перевірка аргументів: порожній текст повертається моделі як помилка', async (t) => {
  await useTemporaryNotes(t);
  const { readNotes } = await load('notes');
  script(
    { tool: 'saveNote', input: { text: '   ' } },
    { text: 'Не вийшло зберегти.' },
  );
  await send('42', 'Запамʼятай порожнє');
  assert.deepEqual(readNotes(), []);
  assert.match(messagesText(1), /"isError":true/);
});

test('04 Власник: без OWNER_CHAT_ID власника немає', async (t) => {
  const { isOwner } = await load('settings');
  useOwner(t, undefined);
  assert.equal(isOwner('42'), false);
  process.env.OWNER_CHAT_ID = '42';
  assert.equal(isOwner('42'), true);
  assert.equal(isOwner('7'), false);
});

test('04 Каталог: deleteNotes бачить лише власник', async (t) => {
  await useTemporaryNotes(t);
  useOwner(t, '42');
  script({ text: 'ok' }, { text: 'ok' });
  await send('owner-check-7', 'Привіт');
  await send('42', 'Привіт');
  assert.ok(!toolNames(0).includes('deleteNotes'));
  assert.ok(toolNames(1).includes('deleteNotes'));
});

test('04 Захист: чужий чат не видаляє навіть на прямий виклик, власник видаляє лише своє', async (t) => {
  await useTemporaryNotes(t);
  useOwner(t, '42');
  const { saveNote, readNotes } = await load('notes');
  saveNote('42', 'Моє');
  saveNote('7', 'Чуже');

  script({ tool: 'deleteNotes', input: {} }, { text: 'Не можу.' });
  await send('7', 'Видали все');
  assert.equal(readNotes().length, 2);
  assert.match(messagesText(1), /not found/);

  script({ tool: 'deleteNotes', input: {} }, { text: 'Видалив.' });
  await send('42', 'Видали мої нотатки');
  assert.deepEqual(readNotes().map((note: { chatId: string }) => note.chatId), ['7']);
});

test('05 Журнал: після відповіді видно тули й токени, без тексту користувача', async (t) => {
  await useTemporaryNotes(t);
  const log = t.mock.method(console, 'log', () => {});
  script(
    { tool: 'saveNote', input: { text: 'Секретний план' } },
    { text: 'Зберіг.' },
  );
  await send('log-1', 'Запамʼятай секретний план');
  const lines = log.mock.calls.map((call) => String(call.arguments[0]));
  const line = lines.find((text) => text.includes('totalTokens'));
  assert.ok(line, 'журнал не надруковано');
  const entry = JSON.parse(line);
  assert.deepEqual(entry.tools, ['saveNote']);
  assert.equal(typeof entry.totalTokens, 'number');
  assert.doesNotMatch(line, /Секретний/);
});

test('06 Skill: модель бачить лише опис, повний текст лише після activate_skill', async () => {
  const { standup } = await load('skill');
  assert.doesNotMatch(standup.instructions, /^---/);

  script(
    { tool: 'activate_skill', input: { name: 'standup' } },
    { text: 'Вчора: …' },
  );
  await send('skill-1', 'Зроби стендап');
  assert.match(String(requests[0].systemPrompt), /standup/);
  assert.doesNotMatch(String(requests[0].systemPrompt), /Не вигадуй фактів/);
  assert.match(messagesText(1), /Не вигадуй фактів/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Динамічні імпорти: ранні гілки запускають лише тести готових етапів.
async function moduleAt(name: string) {
  return import(`../src/${name}.ts`);
}

test('00 Підготовка: всі ранбуки доступні без переходу між гілками', async () => {
  for (const name of ['00-setup', '01-model', '02-telegram', '03-tools', '04-permissions', '05-feedback', '06-skill']) {
    const text = await readFile(new URL(`../runbooks/${name}.md`, import.meta.url), 'utf8');
    assert.match(text, /Навіщо/);
    assert.match(text, /Перевірка/);
  }
});

test('01 Модель: Flue реєструє агента без запиту до провайдера', async () => {
  const { start, sqlite } = await import('@flue/runtime/node');
  const { Assistant } = await moduleAt('agent');
  const runtime = await start({ agents: [Assistant], db: sqlite(':memory:') });
  await runtime.stop();
});

test('02 Telegram: ідентифікатор чату та квитанція не губляться', async () => {
  const { answer } = await moduleAt('bridge');
  for (const chatId of ['42', '7']) {
    const receipt = { requestId: `request-${chatId}` };
    const result = await answer(chatId, 'Привіт', (id: string) => {
      assert.equal(id, chatId);
      return {
        async dispatch(text: string) {
          assert.equal(text, 'Привіт');
          return receipt;
        },
        async read(seen: unknown) {
          assert.equal(seen, receipt);
          return { text: `Відповідь для ${chatId}` };
        },
      };
    });
    assert.equal(result, `Відповідь для ${chatId}`);
  }
});

test('02 Помилки: порожня відповідь і збій не перетворюються на успіх', async () => {
  const { answer } = await moduleAt('bridge');
  let reads = 0;
  await assert.rejects(() => answer('42', 'Запит', () => ({
    dispatch: async () => { throw new Error('API unavailable'); },
    read: async () => { reads++; return { text: 'Готово' }; },
  })), /API unavailable/);
  assert.equal(reads, 0);
  await assert.rejects(() => answer('42', 'Запит', () => ({
    dispatch: async () => 'receipt',
    read: async () => ({ text: '  ' }),
  })), /не повернула текст/);
});

async function temporaryNotes(t: { after: (fn: () => Promise<void>) => void }) {
  const dir = await mkdtemp(join(tmpdir(), 'flue-workshop-'));
  const previous = process.env.NOTES_FILE;
  process.env.NOTES_FILE = join(dir, 'notes.json');
  t.after(async () => {
    if (previous === undefined) delete process.env.NOTES_FILE;
    else process.env.NOTES_FILE = previous;
    await rm(dir, { recursive: true, force: true });
  });
  return process.env.NOTES_FILE;
}

test('03 Нотатки: запис на диску, пошук лише у своєму чаті', async (t) => {
  const file = await temporaryNotes(t);
  const { saveNote, searchNotes, readNotes } = await moduleAt('notes');
  assert.deepEqual(readNotes(), []);
  saveNote('42', '  Зустріч із командою  ');
  saveNote('7', 'Зустріч із клієнтом');
  const saved = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(saved.length, 2);
  assert.equal(searchNotes('42', 'ЗУСТРІЧ')[0].text, 'Зустріч із командою');
  assert.equal(searchNotes('7', 'клієнтом').length, 1);
  assert.equal(searchNotes('42', 'клієнтом').length, 0);
});

test('03 Перевірка даних: порожнє, завелике й пошкоджений файл', async (t) => {
  const file = await temporaryNotes(t);
  const { saveNote, readNotes, maxNoteCharacters } = await moduleAt('notes');
  assert.throws(() => saveNote('42', '  '), /Нотатка/);
  assert.throws(() => saveNote('42', 'x'.repeat(maxNoteCharacters + 1)), /Нотатка/);
  await writeFile(file, JSON.stringify([{ text: 'немає chatId' }]));
  assert.throws(() => readNotes());
  assert.throws(() => saveNote('42', 'Нова'));
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), [{ text: 'немає chatId' }]);
});

test('04 Дозволи: відсутній власник забороняє видалення', async () => {
  const { canDeleteNotes } = await moduleAt('settings');
  const previous = process.env.OWNER_CHAT_ID;
  try {
    delete process.env.OWNER_CHAT_ID;
    assert.equal(canDeleteNotes('42'), false);
    process.env.OWNER_CHAT_ID = '42';
    assert.equal(canDeleteNotes('42'), true);
    assert.equal(canDeleteNotes('7'), false);
  } finally {
    if (previous === undefined) delete process.env.OWNER_CHAT_ID;
    else process.env.OWNER_CHAT_ID = previous;
  }
});

test('04 Guard: прямий виклик також захищений; чужі записи залишаються', async (t) => {
  await temporaryNotes(t);
  const { saveNote, deleteNotes, readNotes } = await moduleAt('notes');
  const previous = process.env.OWNER_CHAT_ID;
  try {
    process.env.OWNER_CHAT_ID = '42';
    saveNote('42', 'Моє'); saveNote('7', 'Чуже');
    assert.throws(() => deleteNotes('7'), /власнику/);
    assert.equal(readNotes().length, 2);
    assert.deepEqual(deleteNotes('42'), { deleted: 1 });
    assert.equal(readNotes()[0].chatId, '7');
    assert.deepEqual(deleteNotes('42'), { deleted: 0 });
  } finally {
    if (previous === undefined) delete process.env.OWNER_CHAT_ID;
    else process.env.OWNER_CHAT_ID = previous;
  }
});

test('04 Каталог: небезпечний тул доступний лише власнику', async () => {
  const { toolsForChat } = await moduleAt('tools');
  const previous = process.env.OWNER_CHAT_ID;
  try {
    process.env.OWNER_CHAT_ID = '42';
    assert.deepEqual(toolsForChat('7').map((tool: { name: string }) => tool.name), ['saveNote', 'searchNotes']);
    assert.deepEqual(toolsForChat('42').map((tool: { name: string }) => tool.name), ['saveNote', 'searchNotes', 'deleteNotes']);
  } finally {
    if (previous === undefined) delete process.env.OWNER_CHAT_ID;
    else process.env.OWNER_CHAT_ID = previous;
  }
});

test('05 Feedback: журнал містить показник, а не текст чи ключ користувача', async (t) => {
  const { reportUsage } = await moduleAt('feedback');
  const log = t.mock.method(console, 'log', () => {});
  reportUsage({ totalTokens: 123, text: 'приватний текст', apiKey: 'секрет' });
  assert.deepEqual(JSON.parse(log.mock.calls[0].arguments[0]), { event: 'usage', totalTokens: 123 });
});

test('06 Skill: інструкція читається з файла без YAML-метаданих', async () => {
  const { standup } = await moduleAt('skill');
  assert.equal(standup.name, 'standup');
  assert.match(standup.instructions, /Не вигадуй фактів/);
  assert.doesNotMatch(standup.instructions, /^---/);
});

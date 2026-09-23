# 03 · Тули для нотаток

## Навіщо

Модель не може записати нотатку самим текстом відповіді. Дамо їй дві конкретні дії: зберегти факт і знайти його. chatId бере код, а не модель.

Початок: `step-02-telegram`. Готовий результат: `step-03-tools`.

## Як працює

Спочатку створюємо звичайні функції у `src/notes.ts`. `Note` виводиться зі схеми Valibot: id, chatId і text — рядки. `readNotes` перевіряє дані з диска. Якщо файл пошкоджений, показуємо помилку; не затираємо його порожнім масивом.

`writeNotes` спочатку пише тимчасовий файл, потім замінює основний. Це простий приклад для одного процесу, не база для кількох серверів. `saveNote` прибирає зайві пробіли й перевіряє довжину. `searchNotes` спочатку обмежує дані своїм чатом і шукає входження тексту; це не семантичний пошук.

Після цього описуємо тули у `src/tools.ts`. `defineTool` поєднує name, description, input і run. Valibot описує та перевіряє аргументи. `run` повертає фактичний результат у output. Описи англійською пояснюють моделі призначення; коментарі й ранбук українською.

Нарешті монтуємо кожний тул через `useTool` у `src/agent.ts`. Модель обирає дію, Flue виконує run. Записаний JSON — дані застосунку; пошук повертає їх моделі лише на виклик тула.

## Невеликі зміни

### `src/agent.ts`

Зміни на цьому етапі. Рядки з `+` додаємо, з `-` замінюємо; символи diff у файл не копіюємо. Повний готовий файл — наприкінці.

```diff
@@ -1,12 +1,22 @@
 'use agent';
 
-import { useModel } from '@flue/runtime';
+import { useModel, useTool, type AgentProps } from '@flue/runtime';
 
-export function Assistant() {
+import { toolsForChat } from './tools.ts';
+
+export function Assistant({ id }: AgentProps) {
   // Провайдера та модель задаємо в .env; цикл виконує Flue.
   useModel(process.env.MODEL || 'google/gemini-2.5-flash');
 
+  for (const tool of toolsForChat(id)) {
+    useTool(tool);
+  }
+
   // Це інструкція агента. Завдання передамо окремим повідомленням.
-  return 'Reply in Ukrainian. Say when you do not know the answer.';
+  return [
+    'Reply in Ukrainian.',
+    'Use tools to save and search notes. Do not invent saved facts.',
+    'Report success only after a successful tool result.',
+  ].join('\n');
 }
 
```

### `src/notes.ts`

1. Додай імпорти та оголошення, які використовуємо нижче.

```ts
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import * as v from 'valibot';
```

2. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
export const maxNoteCharacters = 2_000;
const noteSchema = v.object({
  id: v.string(),
  chatId: v.string(),
  text: v.string(),
});
export type Note = v.InferOutput<typeof noteSchema>;
```

3. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
function notesFile() {
  return process.env.NOTES_FILE || 'notes.json';
}
```

4. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
export function readNotes(): Note[] {
  const file = notesFile();
  if (!existsSync(file)) {
    return [];
  }
```

5. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
  const text = readFileSync(file, 'utf8');
  const data: unknown = JSON.parse(text);
  return v.parse(v.array(noteSchema), data);
}
```

6. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
function writeNotes(notes: Note[]) {
  const file = notesFile();
  const temporaryFile = `${file}.tmp`;
```

7. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
  // Один навчальний процес: спершу повний файл, потім заміна.
  writeFileSync(temporaryFile, JSON.stringify(notes, null, 2), 'utf8');
  renameSync(temporaryFile, file);
}
```

8. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
export function saveNote(chatId: string, text: string) {
  const content = text.trim();
  if (!content || content.length > maxNoteCharacters) {
    throw new Error(`Нотатка має містити від 1 до ${maxNoteCharacters} символів.`);
  }
```

9. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
  const note = { id: randomUUID(), chatId, text: content };
  const notes = readNotes();
  notes.push(note);
  writeNotes(notes);
  return note;
}
```

10. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
export function searchNotes(chatId: string, query: string) {
  const searchText = query.toLowerCase();
  return readNotes().filter((note) => {
    const sameChat = note.chatId === chatId;
    const matches = note.text.toLowerCase().includes(searchText);
    return sameChat && matches;
  });
}
```

### `src/tools.ts`

1. Додай імпорти та оголошення, які використовуємо нижче.

```ts
import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { saveNote, searchNotes, maxNoteCharacters } from './notes.ts';
```

2. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
export function toolsForChat(chatId: string) {
  // chatId отримуємо від Telegram. Модель не задає його в аргументах.
  const save = defineTool({
    name: 'saveNote',
    description: 'Save a note for the current user when they ask to remember it.',
    input: v.object({
      text: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(maxNoteCharacters)),
    }),
    run: ({ data }) => ({ output: saveNote(chatId, data.text) }),
  });
```

3. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
  const search = defineTool({
    name: 'searchNotes',
    description: "Find this user's saved notes containing the query text.",
    input: v.object({ query: v.string() }),
    run: ({ data }) => ({ output: searchNotes(chatId, data.query) }),
  });
```

4. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
  return [save, search];
}
```

## Перевірка

```bash
npm run typecheck
npm test -- --test-name-pattern "^(00|01|02|03) "
npm run bot
```

Напиши «Запамʼятай: сьогодні завершено прототип харнесу». Перевір notes.json. Потім «Знайди нотатку про прототип». Відповідь має спиратися на власний запис.

Якщо тест падає, дивись назву перевірки й фактичний результат. Перевірка типів виявляє помилки TypeScript; локальні тести не доводять доступність провайдера. Для помилки API перевір ключ, точну назву моделі та відповідь сервісу в терміналі.

## Готовий код етапу

Це повний стан змінених файлів. Інші файли залишаються з попереднього етапу.

### `src/agent.ts`

```ts
'use agent';

import { useModel, useTool, type AgentProps } from '@flue/runtime';

import { toolsForChat } from './tools.ts';

export function Assistant({ id }: AgentProps) {
  // Провайдера та модель задаємо в .env; цикл виконує Flue.
  useModel(process.env.MODEL || 'google/gemini-2.5-flash');

  for (const tool of toolsForChat(id)) {
    useTool(tool);
  }

  // Це інструкція агента. Завдання передамо окремим повідомленням.
  return [
    'Reply in Ukrainian.',
    'Use tools to save and search notes. Do not invent saved facts.',
    'Report success only after a successful tool result.',
  ].join('\n');
}

Assistant.agentName = 'workshop-assistant';
```

### `src/notes.ts`

```ts
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import * as v from 'valibot';

export const maxNoteCharacters = 2_000;
const noteSchema = v.object({
  id: v.string(),
  chatId: v.string(),
  text: v.string(),
});
export type Note = v.InferOutput<typeof noteSchema>;

function notesFile() {
  return process.env.NOTES_FILE || 'notes.json';
}

export function readNotes(): Note[] {
  const file = notesFile();
  if (!existsSync(file)) {
    return [];
  }

  const text = readFileSync(file, 'utf8');
  const data: unknown = JSON.parse(text);
  return v.parse(v.array(noteSchema), data);
}

function writeNotes(notes: Note[]) {
  const file = notesFile();
  const temporaryFile = `${file}.tmp`;

  // Один навчальний процес: спершу повний файл, потім заміна.
  writeFileSync(temporaryFile, JSON.stringify(notes, null, 2), 'utf8');
  renameSync(temporaryFile, file);
}

export function saveNote(chatId: string, text: string) {
  const content = text.trim();
  if (!content || content.length > maxNoteCharacters) {
    throw new Error(`Нотатка має містити від 1 до ${maxNoteCharacters} символів.`);
  }

  const note = { id: randomUUID(), chatId, text: content };
  const notes = readNotes();
  notes.push(note);
  writeNotes(notes);
  return note;
}

export function searchNotes(chatId: string, query: string) {
  const searchText = query.toLowerCase();
  return readNotes().filter((note) => {
    const sameChat = note.chatId === chatId;
    const matches = note.text.toLowerCase().includes(searchText);
    return sameChat && matches;
  });
}
```

### `src/tools.ts`

```ts
import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { saveNote, searchNotes, maxNoteCharacters } from './notes.ts';

export function toolsForChat(chatId: string) {
  // chatId отримуємо від Telegram. Модель не задає його в аргументах.
  const save = defineTool({
    name: 'saveNote',
    description: 'Save a note for the current user when they ask to remember it.',
    input: v.object({
      text: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(maxNoteCharacters)),
    }),
    run: ({ data }) => ({ output: saveNote(chatId, data.text) }),
  });

  const search = defineTool({
    name: 'searchNotes',
    description: "Find this user's saved notes containing the query text.",
    input: v.object({ query: v.string() }),
    run: ({ data }) => ({ output: searchNotes(chatId, data.query) }),
  });

  return [save, search];
}
```

## Якщо не встигаєш

```bash
git stash push -u -m "my-day2-progress"
git switch step-03-tools
```

Першою командою зберігаєш власні зміни окремо, включно з новими src-файлами. `.env`, база й нотатки ігноруються Git і залишаються на місці. Не застосовуй stash поверх готової гілки автоматично.

Далі: [04 · Settings і перевірка дозволів](04-permissions.md).

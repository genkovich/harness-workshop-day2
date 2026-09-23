# 04 · Settings і перевірка дозволів

## Навіщо

Інструкція «не видаляй чуже» не гарантує заборони. Приховаємо тул від стороннього чату й повторимо перевірку в самій функції.

Початок: `step-03-tools`. Готовий результат: `step-04-permissions`.

## Як працює

Після `/start` знайди власний ідентифікатор у терміналі й запиши його в OWNER_CHAT_ID у `.env`. Перезапусти бот. Це налаштування власника, не прапорець у промпті.

У `src/settings.ts` створюємо `canDeleteNotes`. Порожнє налаштування означає заборону. У `toolsForChat` додаємо deleteNotes лише власнику. У `deleteNotes` повторюємо перевірку, щоб прямий виклик функції теж не обійшов захист.

Власник видаляє тільки свої нотатки. Цей приклад не містить підтвердження кожної окремої дії людиною: дозвіл дає налаштування. Фраза в описі «лише на пряме прохання» спрямовує модель, але окремим підтвердженням у коді не є.

## Невеликі зміни

### `src/notes.ts`

Зміни на цьому етапі. Рядки з `+` додаємо, з `-` замінюємо; символи diff у файл не копіюємо. Повний готовий файл — наприкінці.

```diff
@@ -1,3 +1,4 @@
 import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
+import { canDeleteNotes } from './settings.ts';
 import { randomUUID } from 'node:crypto';
 import * as v from 'valibot';
@@ -56,2 +57,14 @@
   });
 }
+
+export function deleteNotes(chatId: string) {
+  // Перевірка залишається тут, навіть якщо функцію викличуть без моделі.
+  if (!canDeleteNotes(chatId)) {
+    throw new Error('Видалення дозволене лише власнику.');
+  }
+
+  const notes = readNotes();
+  const remaining = notes.filter((note) => note.chatId !== chatId);
+  writeNotes(remaining);
+  return { deleted: notes.length - remaining.length };
+}
```

### `src/tools.ts`

Зміни на цьому етапі. Рядки з `+` додаємо, з `-` замінюємо; символи diff у файл не копіюємо. Повний готовий файл — наприкінці.

```diff
@@ -1,5 +1,7 @@
 import { defineTool } from '@flue/runtime';
 import * as v from 'valibot';
-import { saveNote, searchNotes, maxNoteCharacters } from './notes.ts';
+import { saveNote, searchNotes, deleteNotes, maxNoteCharacters } from './notes.ts';
+
+import { canDeleteNotes } from './settings.ts';
 
 export function toolsForChat(chatId: string) {
@@ -21,4 +23,16 @@
   });
 
-  return [save, search];
+  const tools = [save, search];
+  if (!canDeleteNotes(chatId)) {
+    return tools;
+  }
+
+  const remove = defineTool({
+    name: 'deleteNotes',
+    description: 'Delete your own saved notes only on an explicit user request.',
+    input: v.object({}),
+    run: () => ({ output: deleteNotes(chatId) }),
+  });
+
+  return [...tools, remove];
 }
```

### `src/settings.ts`

1. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
export function canDeleteNotes(chatId: string) {
  const ownerChatId = process.env.OWNER_CHAT_ID;
  if (!ownerChatId) {
    return false;
  }
```

2. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
  return chatId === ownerChatId;
}
```

## Перевірка

```bash
npm run typecheck
npm test -- --test-name-pattern "^(00|01|02|03|04) "
npm run bot
```

Перевір два чати тестами. Для власника видалення повертає кількість, для іншого заборонене; чужа нотатка залишається. Живий тест проводь на навчальних записах.

Якщо тест падає, дивись назву перевірки й фактичний результат. Перевірка типів виявляє помилки TypeScript; локальні тести не доводять доступність провайдера. Для помилки API перевір ключ, точну назву моделі та відповідь сервісу в терміналі.

## Готовий код етапу

Це повний стан змінених файлів. Інші файли залишаються з попереднього етапу.

### `src/notes.ts`

```ts
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { canDeleteNotes } from './settings.ts';
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

export function deleteNotes(chatId: string) {
  // Перевірка залишається тут, навіть якщо функцію викличуть без моделі.
  if (!canDeleteNotes(chatId)) {
    throw new Error('Видалення дозволене лише власнику.');
  }

  const notes = readNotes();
  const remaining = notes.filter((note) => note.chatId !== chatId);
  writeNotes(remaining);
  return { deleted: notes.length - remaining.length };
}
```

### `src/tools.ts`

```ts
import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { saveNote, searchNotes, deleteNotes, maxNoteCharacters } from './notes.ts';

import { canDeleteNotes } from './settings.ts';

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

  const tools = [save, search];
  if (!canDeleteNotes(chatId)) {
    return tools;
  }

  const remove = defineTool({
    name: 'deleteNotes',
    description: 'Delete your own saved notes only on an explicit user request.',
    input: v.object({}),
    run: () => ({ output: deleteNotes(chatId) }),
  });

  return [...tools, remove];
}
```

### `src/settings.ts`

```ts
export function canDeleteNotes(chatId: string) {
  const ownerChatId = process.env.OWNER_CHAT_ID;
  if (!ownerChatId) {
    return false;
  }

  return chatId === ownerChatId;
}
```

## Якщо не встигаєш

```bash
git stash push -u -m "my-day2-progress"
git switch step-04-permissions
```

Першою командою зберігаєш власні зміни окремо, включно з новими src-файлами. `.env`, база й нотатки ігноруються Git і залишаються на місці. Не застосовуй stash поверх готової гілки автоматично.

Далі: [05 · Журнал і корисний feedback](05-feedback.md).

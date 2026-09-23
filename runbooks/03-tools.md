# 03. Тули для нотаток

[Усі етапи](README.md) · [Попередній](02-telegram.md) · [Наступний](04-permissions.md)

**Перед початком:** код із гілки `step-02-telegram`. **Результат етапу:** `step-03-tools`. Змінюємо лише `src/`.

## Що робимо й навіщо

Зараз бот памʼятає розмову, але це памʼять моделі: вона може щось переплутати, а людина не може відкрити й перевірити, що там лежить. Нам потрібні справжні нотатки у файлі. Код, що їх зберігає, уже є в `src/notes.ts`. Даємо агенту дві дії над ним: зберегти нотатку і знайти нотатки.

## Чого бракує зараз і що зміниться

Учора, щоб додати тул, ми правили чотири місця: опис у `tools`, схему Zod, гілку `case` у `runTool` і `executeTool` з `try/catch`. Сьогодні тул описується одним обʼєктом, а виконання, перевірку аргументів і повернення результату в історію бере Flue.

- `src/tools.ts`: два тули, `saveNote` і `searchNotes`.
- `src/agent.ts`: агент отримує id розмови і підключає тули.
- Модель ніколи не передає `chatId`. Його знає лише наш код, і саме він вирішує, чиї нотатки читати.

## Маленькі зміни

### 1. Подивись на `src/notes.ts`

Файл уже готовий. Три функції, які нам потрібні:

- `saveNote(chatId, text)` дописує нотатку в `notes.json` і повертає її з `id` і датою `createdAt`.
- `searchNotes(chatId, query)` повертає нотатки цього чату, у яких є текст `query`. Порожній `query` поверне всі.
- `deleteNotes(chatId)` видаляє всі нотатки чату. Знадобиться на етапі 04.

Це звичайний код застосунку. Він нічого не знає ні про модель, ні про Flue, і так має бути.

### 2. Тул `saveNote`

Створи `src/tools.ts`:

```ts
import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { saveNote, searchNotes, maxNoteCharacters } from './notes.ts';

// chatId приходить від Telegram через код. Модель його не бачить і не може підмінити.
```

Додай перший тул:

```ts
export function saveNoteTool(chatId: string) {
  return defineTool({
    name: 'saveNote',
    description: 'Save one note for the user when they ask to remember something.',
    input: v.object({
      text: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(maxNoteCharacters)),
    }),
    run: ({ data }) => ({ output: saveNote(chatId, data.text) }),
  });
}
```

Чотири поля `defineTool` відповідають учорашнім чотирьом місцям:

- `name` і `description` бачить модель. Опис вирішує, **коли** модель покличе тул. Ми перевіряли це вчора на етапі 09.
- `input` описує аргументи через Valibot. `v.pipe` застосовує перевірки по черзі: рядок, обрізати пробіли, не порожній, не довший за ліміт. Якщо модель передасть порожній текст, Flue не викличе `run`, а поверне моделі помилку, щоб вона виправилась. Учора це робили `parse` і `try/catch`.
- `run` виконує дію. `data` вже перевірені й типізовані. Те, що лежить в `output`, Flue сам покладе в історію як результат тула.

Навіщо тут функція `saveNoteTool(chatId)` замість простого обʼєкта? Тул створюється для конкретного чату, і `chatId` потрапляє в `run` із замикання. У схемі `input` поля `chatId` немає, тож модель не може попросити «збережи в чат 42». Учора ми вчили: аргументи від моделі це не дозвіл. Тут це вбудовано в саму форму тула.

### 3. Тул `searchNotes`

Нижче в тому ж файлі:

```ts
export function searchNotesTool(chatId: string) {
  return defineTool({
    name: 'searchNotes',
    description: "Find the user's saved notes that contain the query. An empty query returns all notes with their dates.",
    input: v.object({
      query: v.string(),
    }),
    run: ({ data }) => ({ output: searchNotes(chatId, data.query) }),
  });
}
```

Опис прямо каже, що порожній запит поверне все. Без цього модель на «що в мене є?» вигадувала б ключове слово для пошуку.

### 4. Підключи тули до агента

У `src/agent.ts` заміни рядок `import { useModel } from '@flue/runtime';` на два імпорти:

```ts
import { useModel, useTool, type AgentProps } from '@flue/runtime';
import { saveNoteTool, searchNotesTool } from './tools.ts';
```

Далі заміни функцію `Assistant` цілком, від коментаря над нею до закривної дужки `}`. Рядок `Assistant.agentName` під нею лишається:

```ts
// Flue викликає цю функцію перед кожним запитом до моделі. Цикл, історія й виконання тулів на ньому.
export function Assistant({ id }: AgentProps) {
  useModel(process.env.MODEL || 'google/gemini-2.5-flash');

  useTool(saveNoteTool(id));
  useTool(searchNotesTool(id));

  // Рядок, який повертаємо, стає інструкцією агента (system prompt).
  return [
    'You are a personal notes assistant in Telegram. Reply in Ukrainian, briefly.',
    'Use saveNote and searchNotes for notes. Never claim a note is saved or found without a tool result.',
    'If a tool returns an error, tell the user what failed.',
  ].join('\n');
}
```

Що змінилось:

- Функція отримує `{ id }`. Це той самий id, який `chat.ts` передав в `init`, тобто id чату. `AgentProps` описує цей параметр для TypeScript.
- `useTool` додає тул до списку, який модель побачить у запиті. Обидва тули створюємо з `id`, тож вони працюють лише з нотатками цього чату.
- В інструкції два нові правила. Друге ми вже зустрічали вчора: «готово» від моделі нічого не доводить, доводить результат тула.

### 5. Перевір у терміналі

```bash
npm run check
npm run ask -- "Запамʼятай: у пʼятницю реліз о 15:00"
```

У кроках Flue має зʼявитися `tool saveNote`. Відкрий `notes.json`: там нотатка з `chatId: "terminal"`, бо саме такий id у скрипта `ask`.

```bash
npm run ask -- "Коли в мене реліз?"
```

## Перевірка

```bash
npm run check
npm test -- --test-name-pattern "^(00|01|02|03) "
npm run bot
```

**Автоматична перевірка:** 8 тестів без мережі. Скриптована модель просить `saveNote`, і тест дивиться: модель бачила рівно два тули, файл містить нотатку з `chatId` від коду, результат тула повернувся моделі. Окремий тест передає порожній текст і перевіряє, що файл не змінився, а модель отримала помилку.

**Очікуємо вручну:** у Telegram «запамʼятай …», потім «що в мене є?». У `notes.json` зʼявилась нотатка з id твого чату. Сусід через твого бота твоїх нотаток не бачить.

**Якщо не так:**

- Модель відповідає «зберіг», а в `notes.json` нічого немає: дивись кроки в терміналі. Якщо `saveNote` не викликався, це і є причина, чому в інструкції є правило про результат тула.
- `Type 'string' is not assignable…` у `Assistant`: перевір, що функція приймає `{ id }: AgentProps`.

**Збережи свою зміну:**

```bash
git add src
git diff --cached
git commit -m "Етап 03: тули для нотаток"
```

## Якщо не встиг: готова гілка

```bash
git add src
git diff --cached --quiet || git commit -m "Моя спроба етапу 03"
git fetch origin
git switch -c work-04 origin/step-03-tools
npm run check
```

Твій коміт лишився в попередній гілці. `notes.json` не в Git, тому твої нотатки лишаються.

Якщо встиг сам, продовжуй у своїй гілці з [етапу 04](04-permissions.md).

## Готовий код

Повний вміст файлів, які змінились на цьому етапі. Решта файлів лишається як була.

<details>
<summary>src/agent.ts</summary>

```ts
'use agent';

import { useModel, useTool, type AgentProps } from '@flue/runtime';
import { saveNoteTool, searchNotesTool } from './tools.ts';

// Flue викликає цю функцію перед кожним запитом до моделі. Цикл, історія й виконання тулів на ньому.
export function Assistant({ id }: AgentProps) {
  useModel(process.env.MODEL || 'google/gemini-2.5-flash');

  useTool(saveNoteTool(id));
  useTool(searchNotesTool(id));

  // Рядок, який повертаємо, стає інструкцією агента (system prompt).
  return [
    'You are a personal notes assistant in Telegram. Reply in Ukrainian, briefly.',
    'Use saveNote and searchNotes for notes. Never claim a note is saved or found without a tool result.',
    'If a tool returns an error, tell the user what failed.',
  ].join('\n');
}

Assistant.agentName = 'workshop-assistant';
```

</details>

<details>
<summary>src/tools.ts</summary>

```ts
import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { saveNote, searchNotes, maxNoteCharacters } from './notes.ts';

// chatId приходить від Telegram через код. Модель його не бачить і не може підмінити.

export function saveNoteTool(chatId: string) {
  return defineTool({
    name: 'saveNote',
    description: 'Save one note for the user when they ask to remember something.',
    input: v.object({
      text: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(maxNoteCharacters)),
    }),
    run: ({ data }) => ({ output: saveNote(chatId, data.text) }),
  });
}

export function searchNotesTool(chatId: string) {
  return defineTool({
    name: 'searchNotes',
    description: "Find the user's saved notes that contain the query. An empty query returns all notes with their dates.",
    input: v.object({
      query: v.string(),
    }),
    run: ({ data }) => ({ output: searchNotes(chatId, data.query) }),
  });
}
```

</details>

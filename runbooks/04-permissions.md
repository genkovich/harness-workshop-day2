# 04. Власник бота

[Усі етапи](README.md) · [Попередній](03-tools.md) · [Наступний](05-feedback.md)

**Перед початком:** код із гілки `step-03-tools`. **Результат етапу:** `step-04-permissions`. Змінюємо лише `src/`.

## Що робимо й навіщо

Додаємо небезпечну дію: видалити всі нотатки. Її має отримати лише власник бота. Твого бота може знайти будь-хто, тож фраза в інструкції «видаляй лише для власника» нічого не гарантує: модель можна вмовити.

## Чого бракує зараз і що зміниться

Учора ми ставили guard у `executeTool`: модель просить `saveDigest`, код перевіряє дозвіл і блокує виклик. Сьогодні `executeTool` належить Flue, тож перевірку ставимо на вході, який лишився нашим, у функції агента. Тул, який не дозволено, **не підключаємо зовсім**. Модель не бачить його в списку і не може викликати.

- `src/settings.ts`: хто власник. Бере `OWNER_CHAT_ID` з `.env`.
- `src/tools.ts`: тул `deleteNotes`.
- `src/agent.ts`: `useTool(deleteNotesTool(id))` лише якщо `isOwner(id)`.

## Маленькі зміни

### 1. Налаштування: `src/settings.ts`

```ts
// Налаштування читає лише код, модель його не бачить. Порожній OWNER_CHAT_ID означає «власника немає».
export function isOwner(chatId: string) {
  const ownerChatId = process.env.OWNER_CHAT_ID;
  return Boolean(ownerChatId) && chatId === ownerChatId;
}
```

Як і вчорашній `APPROVED=1`, це налаштування для коду. У промпт воно не потрапляє. `Boolean(ownerChatId)` потрібен, щоб порожнє значення ніколи не збіглося з порожнім id.

### 2. Тул `deleteNotes`

У `src/tools.ts` додай `deleteNotes` до імпорту з `./notes.ts`:

```ts
import { saveNote, searchNotes, deleteNotes, maxNoteCharacters } from './notes.ts';
```

І новий тул у кінці файла:

```ts
export function deleteNotesTool(chatId: string) {
  return defineTool({
    name: 'deleteNotes',
    description: "Delete all of the user's notes. Use only when the user explicitly asks to delete them.",
    input: v.object({}),
    run: () => ({ output: deleteNotes(chatId) }),
  });
}
```

Аргументів немає: `v.object({})`. Що видаляти, визначає `chatId` із замикання, тож навіть власник видаляє лише нотатки свого чату. Фраза «only when the user explicitly asks» у описі допомагає моделі не видалити нотатки випадково. Це лише підказка моделі. Захищає нас `if` в агенті, до нього дійдемо в наступному кроці.

### 3. Умовний тул в агенті

У `src/agent.ts` онови імпорти:

```ts
import { saveNoteTool, searchNotesTool, deleteNotesTool } from './tools.ts';
import { isOwner } from './settings.ts';
```

Після двох `useTool` додай:

```ts
  // Не власник не отримує тул зовсім: модель не може викликати те, чого немає в списку.
  if (isOwner(id)) {
    useTool(deleteNotesTool(id));
  }
```

Пригадай етап 01: Flue викликає `Assistant` перед кожним запитом до моделі. Тому `if` тут працює як перемикач: для чату власника список тулів містить три тули, для решти два. Якщо модель чужого чату все ж спробує викликати `deleteNotes`, Flue поверне їй помилку `Tool deleteNotes not found`, а `run` не виконається.

Вчора ми забороняли виклик, сьогодні не даємо можливості. Друге надійніше: нема що обходити. Але воно працює лише тому, що `deleteNotes` у нас викликає тільки модель. Якби цю функцію викликав ще й інший вхід, наприклад HTTP-ендпоінт чи cron, перевірку `isOwner` треба було б поставити і там.

### 4. Признач себе власником

```bash
npm run check
npm run bot
```

Надішли боту `/start`, він відповість твоїм chat id. Зупини бота (Ctrl+C), впиши id у `.env`:

```bash
OWNER_CHAT_ID=123456789
```

Запусти бота знову. `.env` читається лише при старті процесу.

## Перевірка

```bash
npm run check
npm test -- --test-name-pattern "^(00|01|02|03|04) "
npm run bot
```

**Автоматична перевірка:** 11 тестів без мережі. Тест дивиться список тулів у запиті до моделі: у чаті власника є `deleteNotes`, в іншому немає. Інший тест змушує скриптовану модель чужого чату викликати `deleteNotes` напряму: нотатки лишаються, модель отримує `not found`. Власник видаляє лише своє.

**Очікуємо вручну:** ти пишеш боту «видали всі мої нотатки», у терміналі видно `deleteNotes`, у `notes.json` твоїх нотаток більше немає. Сусід пише те саме твоєму боту: модель відповідає, що не може, а його нотатки на місці.

Те саме без Telegram, для чату `terminal`:

```bash
OWNER_CHAT_ID=terminal npm run ask -- "Видали всі мої нотатки"
npm run ask -- "Видали всі мої нотатки"
```

Змінна з командного рядка перекриває `.env` лише для цього запуску. У першому випадку `deleteNotes` є серед тулів, у другому немає.

Якщо ти вже говорив з ботом до того, як став власником, Flue додасть у розмову службове повідомлення про новий тул. Це нормально: так модель дізнається, що список змінився посеред розмови.

**Якщо не так:** тул не зʼявився у власника. Перевір, що в `.env` рівно id з `/start`, без пробілів, і що бота перезапущено.

**Збережи свою зміну:**

```bash
git add src
git diff --cached
git commit -m "Етап 04: власник бота"
```

## Якщо не встиг: готова гілка

```bash
git add src
git diff --cached --quiet || git commit -m "Моя спроба етапу 04"
git fetch origin
git switch -c work-05 origin/step-04-permissions
npm run check
```

Якщо встиг сам, продовжуй у своїй гілці з [етапу 05](05-feedback.md).

## Готовий код

Повний вміст файлів, які змінились на цьому етапі. Решта файлів лишається як була.

<details>
<summary>src/agent.ts</summary>

```ts
'use agent';

import { useModel, useTool, type AgentProps } from '@flue/runtime';
import { saveNoteTool, searchNotesTool, deleteNotesTool } from './tools.ts';
import { isOwner } from './settings.ts';

// Flue викликає цю функцію перед кожним запитом до моделі. Цикл, історія й виконання тулів на ньому.
export function Assistant({ id }: AgentProps) {
  useModel(process.env.MODEL || 'google/gemini-2.5-flash');

  useTool(saveNoteTool(id));
  useTool(searchNotesTool(id));
  // Не власник не отримує тул зовсім: модель не може викликати те, чого немає в списку.
  if (isOwner(id)) {
    useTool(deleteNotesTool(id));
  }

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
import { saveNote, searchNotes, deleteNotes, maxNoteCharacters } from './notes.ts';

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

export function deleteNotesTool(chatId: string) {
  return defineTool({
    name: 'deleteNotes',
    description: "Delete all of the user's notes. Use only when the user explicitly asks to delete them.",
    input: v.object({}),
    run: () => ({ output: deleteNotes(chatId) }),
  });
}
```

</details>

<details>
<summary>src/settings.ts</summary>

```ts
// Налаштування читає лише код, модель його не бачить. Порожній OWNER_CHAT_ID означає «власника немає».
export function isOwner(chatId: string) {
  const ownerChatId = process.env.OWNER_CHAT_ID;
  return Boolean(ownerChatId) && chatId === ownerChatId;
}
```

</details>

# 05. Журнал відповіді

[Усі етапи](README.md) · [Попередній](04-permissions.md) · [Наступний](06-skill.md)

**Перед початком:** код із гілки `step-04-permissions`. **Результат етапу:** `step-05-feedback`. Змінюємо лише `src/`.

## Що робимо й навіщо

`npm run ask` показує кожен крок агента, бо так уміє `flue run`. А от бот у терміналі мовчить: ми бачимо лише відповідь у Telegram. Чи викликала модель `saveNote`, чи просто написала «зберіг»? Скільки токенів коштувало повідомлення? Учора ці питання закривав наш `console.log` усередині циклу. Сьогодні цикл не наш, тож видимість повертаємо через хук Flue.

## Чого бракує зараз і що зміниться

- `src/log.ts`: одна функція, що друкує рядок журналу.
- `src/agent.ts`: хук `useResponseFinish` викликає її, коли відповідь завершена.
- У журналі лише назви тулів, ознака помилки й кількість токенів. Текст користувача й нотатки туди не потрапляють.

## Маленькі зміни

### 1. Рядок журналу: `src/log.ts`

Спершу опиши, що саме ми отримаємо від Flue:

```ts
type Response = {
  toolCalls: readonly { tool: string; isError: boolean }[];
  usage: { totalTokens: number };
};
```

`toolCalls` це всі виклики тулів за відповідь, навіть якщо модель ходила по колу кілька разів. `usage` сумує токени за всі запити до моделі в межах цієї відповіді. Беремо лише поля, які друкуємо.

Нижче сама функція:

```ts
// Цикл веде Flue, тож кроків ми не бачимо. Після відповіді друкуємо, що сталося насправді.
export function logResponse(response: Response) {
  const line = {
    tools: response.toolCalls.map((call) => (call.isError ? `${call.tool} (помилка)` : call.tool)),
    totalTokens: response.usage.totalTokens,
  };
  console.log(JSON.stringify(line));
}
```

Один рядок JSON на відповідь. Такий журнал легко читати очима і легко розібрати програмою.

### 2. Хук в агенті

У `src/agent.ts` заміни рядок імпорту з `@flue/runtime`, щоб додати `useResponseFinish`:

```ts
import { useModel, useTool, useResponseFinish, type AgentProps } from '@flue/runtime';
```

Під рядком `import { isOwner } from './settings.ts';` додай імпорт нашої функції:

```ts
import { logResponse } from './log.ts';
```

Після блоку `if (isOwner(id)) { ... }`, перед коментарем `// Рядок, який повертаємо…`, додай хук:

```ts
  useResponseFinish(({ response }) => {
    logResponse(response);
  });
```

`useResponseFinish` Flue викликає один раз, коли відповідь повністю готова. У Flue є й інші хуки подій, наприклад на початку відповіді. Для журналу потрібен саме кінець: тоді список тулів і токени вже остаточні.

## Перевірка

```bash
npm run check
npm test -- --test-name-pattern "^(00|01|02|03|04|05) "
npm run bot
```

**Автоматична перевірка:** 12 тестів без мережі. Скриптована модель зберігає нотатку зі словом «Секретний», тест перехоплює `console.log` і перевіряє: рядок містить `saveNote` і число токенів, а слова «Секретний» у журналі немає.

**Очікуємо вручну.** Напиши боту три повідомлення і подивись у термінал:

| Повідомлення | Рядок журналу |
|---|---|
| «Привіт» | `{"tools":[],"totalTokens":…}` |
| «Запамʼятай: купити квитки» | `{"tools":["saveNote"],"totalTokens":…}` |
| «Що в мене є?» | `{"tools":["searchNotes"],"totalTokens":…}` |

Порівняй токени першого і другого рядка. Навіть «Привіт» коштує понад тисячу токенів: інструкція і описи всіх тулів ідуть у кожен запит. Кожен новий тул робить дорожчим кожне повідомлення, навіть те, де тул не потрібен.

Якщо бачиш `"saveNote (помилка)"`, модель передала аргументи, які не пройшли перевірку. Flue повернув їй помилку, і модель могла спробувати ще раз: тоді в списку буде і помилковий, і вдалий виклик.

**Про повтори.** Flue сам повторює запит до моделі після тимчасової помилки, наприклад 429. Уже виконаний тул при цьому не запускається вдруге. Задвоєна нотатка частіше буває з іншої причини: Telegram повторно надіслав повідомлення, бо бота зупинили без `bot.stop()`. Саме тому в `bot.ts` є обробник Ctrl+C.

**Збережи свою зміну:**

```bash
git add src
git diff --cached
git commit -m "Етап 05: журнал відповіді"
```

## Якщо не встиг: готова гілка

```bash
git add src
git diff --cached --quiet || git commit -m "Моя спроба етапу 05"
git fetch origin
git switch -c work-06 origin/step-05-feedback
npm run check
```

Якщо встиг сам, продовжуй у своїй гілці з [етапу 06](06-skill.md).

## Готовий код

Повний вміст файлів, які змінились на цьому етапі. Решта файлів лишається як була.

<details>
<summary>src/agent.ts</summary>

```ts
'use agent';

import { useModel, useTool, useResponseFinish, type AgentProps } from '@flue/runtime';
import { saveNoteTool, searchNotesTool, deleteNotesTool } from './tools.ts';
import { isOwner } from './settings.ts';
import { logResponse } from './log.ts';

// Flue викликає цю функцію перед кожним запитом до моделі. Цикл, історія й виконання тулів на ньому.
export function Assistant({ id }: AgentProps) {
  useModel(process.env.MODEL || 'google/gemini-2.5-flash');

  useTool(saveNoteTool(id));
  useTool(searchNotesTool(id));
  // Не власник не отримує тул зовсім: модель не може викликати те, чого немає в списку.
  if (isOwner(id)) {
    useTool(deleteNotesTool(id));
  }

  useResponseFinish(({ response }) => {
    logResponse(response);
  });

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
<summary>src/log.ts</summary>

```ts
type Response = {
  toolCalls: readonly { tool: string; isError: boolean }[];
  usage: { totalTokens: number };
};

// Цикл веде Flue, тож кроків ми не бачимо. Після відповіді друкуємо, що сталося насправді.
export function logResponse(response: Response) {
  const line = {
    tools: response.toolCalls.map((call) => (call.isError ? `${call.tool} (помилка)` : call.tool)),
    totalTokens: response.usage.totalTokens,
  };
  console.log(JSON.stringify(line));
}
```

</details>

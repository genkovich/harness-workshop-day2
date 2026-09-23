# 05 · Журнал і корисний feedback

## Навіщо

Хочемо бачити, що сталося насправді. Показник токенів допомагає порівнювати запуски, а результат тула — відрізняти виконану дію від обіцянки.

Початок: `step-04-permissions`. Готовий результат: `step-05-feedback`.

## Як працює

Створюємо `src/feedback.ts`: функція отримує usage і записує лише потрібний показник. Текст повідомлення та ключ API в журнал не додаємо. Підключаємо її через `useResponseFinish`: це подія завершення відповіді, а не кожного токена.

Кількість токенів сама по собі не визначає якість. Для того самого запиту перевір: чи знайдено потрібну нотатку, чи не зачеплено чужі дані, чи є фактичний результат запису. Порівнюй однакові задачі.

Корисний feedback — «не знайдено нотаток за query=X», а не просто «погано». Тул повертає дані або помилку, за якими агент може змінити наступний крок. `console.log` читає людина; модель не бачить журнал автоматично.

Не додаємо власний retry поверх усього Telegram-обробника. Повтор API та повтор запису — різні операції. Після збою спочатку перевіряємо, чи дія вже відбулася. Правила повторів самого runtime не прирівнюємо до exactly-once виконання зовнішніх ефектів.

## Невеликі зміни

### `src/agent.ts`

Зміни на цьому етапі. Рядки з `+` додаємо, з `-` замінюємо; символи diff у файл не копіюємо. Повний готовий файл — наприкінці.

```diff
@@ -1,7 +1,8 @@
 'use agent';
 
-import { useModel, useTool, type AgentProps } from '@flue/runtime';
+import { useModel, useTool, useResponseFinish, type AgentProps } from '@flue/runtime';
 
 import { toolsForChat } from './tools.ts';
+import { reportUsage } from './feedback.ts';
 
 export function Assistant({ id }: AgentProps) {
@@ -12,4 +13,8 @@
     useTool(tool);
   }
+
+  useResponseFinish(({ response }) => {
+    reportUsage(response.usage);
+  });
 
   // Це інструкція агента. Завдання передамо окремим повідомленням.
```

### `src/feedback.ts`

1. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
type Usage = {
  totalTokens: number;
};
```

2. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
export function reportUsage(usage: Usage) {
  const event = {
    event: 'usage',
    totalTokens: usage.totalTokens,
  };
```

3. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
  console.log(JSON.stringify(event));
}
```

## Перевірка

```bash
npm run typecheck
npm test -- --test-name-pattern "^(00|01|02|03|04|05) "
npm run bot
```

Після відповіді у терміналі є JSON із event=usage і totalTokens. Окремо перевір фактичний результат дії. Менше токенів при неправильному результаті — не покращення.

Якщо тест падає, дивись назву перевірки й фактичний результат. Перевірка типів виявляє помилки TypeScript; локальні тести не доводять доступність провайдера. Для помилки API перевір ключ, точну назву моделі та відповідь сервісу в терміналі.

## Готовий код етапу

Це повний стан змінених файлів. Інші файли залишаються з попереднього етапу.

### `src/agent.ts`

```ts
'use agent';

import { useModel, useTool, useResponseFinish, type AgentProps } from '@flue/runtime';

import { toolsForChat } from './tools.ts';
import { reportUsage } from './feedback.ts';

export function Assistant({ id }: AgentProps) {
  // Провайдера та модель задаємо в .env; цикл виконує Flue.
  useModel(process.env.MODEL || 'google/gemini-2.5-flash');

  for (const tool of toolsForChat(id)) {
    useTool(tool);
  }

  useResponseFinish(({ response }) => {
    reportUsage(response.usage);
  });

  // Це інструкція агента. Завдання передамо окремим повідомленням.
  return [
    'Reply in Ukrainian.',
    'Use tools to save and search notes. Do not invent saved facts.',
    'Report success only after a successful tool result.',
  ].join('\n');
}

Assistant.agentName = 'workshop-assistant';
```

### `src/feedback.ts`

```ts
type Usage = {
  totalTokens: number;
};

export function reportUsage(usage: Usage) {
  const event = {
    event: 'usage',
    totalTokens: usage.totalTokens,
  };

  console.log(JSON.stringify(event));
}
```

## Якщо не встигаєш

```bash
git stash push -u -m "my-day2-progress"
git switch step-05-feedback
```

Першою командою зберігаєш власні зміни окремо, включно з новими src-файлами. `.env`, база й нотатки ігноруються Git і залишаються на місці. Не застосовуй stash поверх готової гілки автоматично.

Далі: [06 · Skill для стендапу](06-skill.md).

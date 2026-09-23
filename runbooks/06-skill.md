# 06 · Skill для стендапу

## Навіщо

Стендап потребує порядку роботи й формату відповіді. Винесемо ці вказівки у skill, щоб не перевантажувати постійну інструкцію агента.

Початок: `step-05-feedback`. Готовий результат: `step-06-skill`.

## Як працює

Файл `skills/standup/SKILL.md` уже є в заготовці. У `src/skill.ts` читаємо текст, прибираємо YAML-заголовок і передаємо інструкцію в defineSkill. Регулярний вираз тут видаляє початковий блок між двома `---`; він не є універсальним YAML-парсером.

У `src/agent.ts` додаємо useSkill. Код читає файл під час завантаження модуля; це не означає, що вся інструкція вже передана моделі. Flue реєструє skill і забезпечує його активацію. Точний механізм показуємо за документацією встановленої версії.

Skill описує процедуру: знайти власні нотатки, розділити зроблене й плани, не вигадати блокери. Він використовує ті самі тули й дозволи. Нового агента або окремого незалежного циклу ми не створюємо.

## Невеликі зміни

### `src/agent.ts`

Зміни на цьому етапі. Рядки з `+` додаємо, з `-` замінюємо; символи diff у файл не копіюємо. Повний готовий файл — наприкінці.

```diff
@@ -1,8 +1,9 @@
 'use agent';
 
-import { useModel, useTool, useResponseFinish, type AgentProps } from '@flue/runtime';
+import { useModel, useTool, useSkill, useResponseFinish, type AgentProps } from '@flue/runtime';
 
 import { toolsForChat } from './tools.ts';
 import { reportUsage } from './feedback.ts';
+import { standup } from './skill.ts';
 
 export function Assistant({ id }: AgentProps) {
@@ -14,4 +15,6 @@
   }
 
+  useSkill(standup);
+
   useResponseFinish(({ response }) => {
     reportUsage(response.usage);
@@ -22,4 +25,5 @@
     'Reply in Ukrainian.',
     'Use tools to save and search notes. Do not invent saved facts.',
+    'Activate the standup skill when the user asks for a standup.',
     'Report success only after a successful tool result.',
   ].join('\n');
```

### `src/skill.ts`

1. Додай імпорти та оголошення, які використовуємо нижче.

```ts
import { defineSkill } from '@flue/runtime';
import { readFileSync } from 'node:fs';
```

2. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
const file = new URL('../skills/standup/SKILL.md', import.meta.url);
const text = readFileSync(file, 'utf8');
// Метадані для каталогу задаємо нижче; прибираємо YAML-заголовок файла.
const instructions = text.replace(/^---[\s\S]*?---\s*/, '');
```

3. Додай наступну частину в цей самий файл, зберігаючи порядок.

```ts
export const standup = defineSkill({
  name: 'standup',
  description: 'Prepare a standup from saved notes: yesterday, today, blockers.',
  instructions,
});
```

## Перевірка

```bash
npm run typecheck
npm test -- --test-name-pattern "^(00|01|02|03|04|05|06) "
npm run bot
```

Попроси «Зроби стендап із моїх нотаток». Є розділи «Вчора», «Сьогодні», «Блокери»; відсутні факти позначено, а не вигадано. Перевір, чи відповідає зміст збереженим нотаткам.

Якщо тест падає, дивись назву перевірки й фактичний результат. Перевірка типів виявляє помилки TypeScript; локальні тести не доводять доступність провайдера. Для помилки API перевір ключ, точну назву моделі та відповідь сервісу в терміналі.

## Готовий код етапу

Це повний стан змінених файлів. Інші файли залишаються з попереднього етапу.

### `src/agent.ts`

```ts
'use agent';

import { useModel, useTool, useSkill, useResponseFinish, type AgentProps } from '@flue/runtime';

import { toolsForChat } from './tools.ts';
import { reportUsage } from './feedback.ts';
import { standup } from './skill.ts';

export function Assistant({ id }: AgentProps) {
  // Провайдера та модель задаємо в .env; цикл виконує Flue.
  useModel(process.env.MODEL || 'google/gemini-2.5-flash');

  for (const tool of toolsForChat(id)) {
    useTool(tool);
  }

  useSkill(standup);

  useResponseFinish(({ response }) => {
    reportUsage(response.usage);
  });

  // Це інструкція агента. Завдання передамо окремим повідомленням.
  return [
    'Reply in Ukrainian.',
    'Use tools to save and search notes. Do not invent saved facts.',
    'Activate the standup skill when the user asks for a standup.',
    'Report success only after a successful tool result.',
  ].join('\n');
}

Assistant.agentName = 'workshop-assistant';
```

### `src/skill.ts`

```ts
import { defineSkill } from '@flue/runtime';
import { readFileSync } from 'node:fs';

const file = new URL('../skills/standup/SKILL.md', import.meta.url);
const text = readFileSync(file, 'utf8');
// Метадані для каталогу задаємо нижче; прибираємо YAML-заголовок файла.
const instructions = text.replace(/^---[\s\S]*?---\s*/, '');

export const standup = defineSkill({
  name: 'standup',
  description: 'Prepare a standup from saved notes: yesterday, today, blockers.',
  instructions,
});
```

## Якщо не встигаєш

```bash
git stash push -u -m "my-day2-progress"
git switch step-06-skill
```

Першою командою зберігаєш власні зміни окремо, включно з новими src-файлами. `.env`, база й нотатки ігноруються Git і залишаються на місці. Не застосовуй stash поверх готової гілки автоматично.

Маємо агента з інтерфейсом, тулами, перевіркою доступу та skill. Наступний крок розвитку — обрати реальний збій і перевірити одну зміну на тих самих задачах. Обовʼязкового фінального збереження чи домашнього завдання немає.

# 06. Skill для стендапу

[Усі етапи](README.md) · [Попередній](05-feedback.md)

**Перед початком:** код із гілки `step-05-feedback`. **Результат етапу:** `step-06-skill`. Змінюємо лише `src/`.

## Що робимо й навіщо

Хочемо, щоб бот складав стендап з нотаток у сталому форматі. Інструкцію для цього можна дописати в system prompt, але тоді вона йтиме в кожен запит, навіть у «привіт». Skill дає інструкцію лише тоді, коли вона потрібна.

## Чого бракує зараз і що зміниться

Учора ми писали skills самі: читали папку, складали каталог описів у контекст і додавали тул `readSkill`. Сьогодні лишається тільки прочитати файл. Каталог і тул `activate_skill` додає Flue.

- `skills/standup/SKILL.md` уже лежить у репозиторії.
- `src/skill.ts`: читаємо файл і створюємо skill через `defineSkill`.
- `src/agent.ts`: `useSkill(standup)`.

## Маленькі зміни

### 1. Подивись на `skills/standup/SKILL.md`

Між `---` лежать назва й опис. Опис модель бачить завжди, і лише за ним вирішує, чи потрібен skill. Нижче сама процедура: спершу `searchNotes`, потім три рядки «Зроблено», «Далі», «Блокери». Першим кроком стоїть виклик тула, щоб модель брала факти з нотаток. Без нього вона складе стендап з памʼяті розмови.

### 2. Skill з файла: `src/skill.ts`

```ts
import { defineSkill } from '@flue/runtime';
import { readFileSync } from 'node:fs';
```

Прочитай файл і дістань опис, як учора в `skills.ts`:

```ts
// Учора каталог і readSkill писали самі. Сьогодні лишилось прочитати файл: решту робить Flue.
const text = readFileSync(new URL('../skills/standup/SKILL.md', import.meta.url), 'utf8');
const description = /^description: (.+)$/m.exec(text)?.[1];
if (!description) {
  throw new Error('Немає description у skills/standup/SKILL.md');
}
```

Створи skill:

```ts
export const standup = defineSkill({
  name: 'standup',
  description,
  // Модель отримає цей текст лише після activate_skill. Заголовок між --- прибираємо.
  instructions: text.replace(/^---[\s\S]*?---\s*/, ''),
});
```

У документації Flue skill підключають коротше: `import standup from '../skills/standup/SKILL.md'`. Такий імпорт працює, коли код збирає Flue (`flue run` чи vite). Бота ми запускаємо через `tsx`, а він Markdown імпортувати не вміє, тому читаємо файл самі.

### 3. Підключи skill

У `src/agent.ts` заміни рядок імпорту з `@flue/runtime`, щоб додати `useSkill`:

```ts
import { useModel, useTool, useSkill, useResponseFinish, type AgentProps } from '@flue/runtime';
```

Під рядком `import { logResponse } from './log.ts';` імпортуй skill:

```ts
import { standup } from './skill.ts';
```

Після блоку `if (isOwner(id)) { ... }`, перед `useResponseFinish`, додай:

```ts
  useSkill(standup);
```

Тепер у system prompt зʼявиться розділ `Available Skills` з одним рядком: назва й опис. Коли модель вирішить, що просять стендап, вона викличе тул `activate_skill` і отримає повну інструкцію як результат тула. System prompt при цьому не змінюється.

## Перевірка

```bash
npm run check
npm test
npm run bot
```

**Автоматична перевірка:** усі 13 тестів без мережі. Тест `06 Skill` дивиться, що перший запит до моделі містить опис skill, але не містить тексту процедури, а після `activate_skill` процедура є в історії.

**Очікуємо вручну.** Додай боту кілька нотаток: що зробив, що плануєш, що заважає. Потім попроси «зроби стендап». У журналі:

```text
{"tools":["activate_skill","searchNotes"],"totalTokens":…}
```

Відповідь має три рядки: Зроблено, Далі, Блокери.

**Якщо не так:**

- У журналі немає `activate_skill`: модель не впізнала задачу за описом. Напиши прямо «зроби стендап» або уточни `description` у `SKILL.md`.
- Є `activate_skill`, але немає `searchNotes`: модель склала стендап з памʼяті розмови. Перевір, що перший крок у `SKILL.md` на місці.

**Збережи свою зміну:**

```bash
git add src
git diff --cached
git commit -m "Етап 06: skill для стендапу"
```

## Що далі

Готове рішення лежить у `main` і `step-06-skill`. Порівняй свій код з ними:

```bash
git fetch origin
git diff origin/main -- src
```

Що можна спробувати самостійно: другий skill (наприклад, підсумок тижня), тул `deleteNote` для однієї нотатки за id, або власника, який бачить статистику всіх чатів. Для останнього подумай, хто і як перевіряє дозвіл.

## Готовий код

Повний вміст файлів, які змінились на цьому етапі. Решта файлів лишається як була.

<details>
<summary>src/agent.ts</summary>

```ts
'use agent';

import { useModel, useTool, useSkill, useResponseFinish, type AgentProps } from '@flue/runtime';
import { saveNoteTool, searchNotesTool, deleteNotesTool } from './tools.ts';
import { isOwner } from './settings.ts';
import { logResponse } from './log.ts';
import { standup } from './skill.ts';
import { DEFAULT_MODEL } from './models.ts';

// Flue викликає цю функцію перед кожним запитом до моделі. Цикл, історія й виконання тулів на ньому.
export function Assistant({ id }: AgentProps) {
  useModel(process.env.MODEL || DEFAULT_MODEL);

  useTool(saveNoteTool(id));
  useTool(searchNotesTool(id));
  // Не власник не отримує тул зовсім: модель не може викликати те, чого немає в списку.
  if (isOwner(id)) {
    useTool(deleteNotesTool(id));
  }

  useSkill(standup);

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
<summary>src/skill.ts</summary>

```ts
import { defineSkill } from '@flue/runtime';
import { readFileSync } from 'node:fs';

// Учора каталог і readSkill писали самі. Сьогодні лишилось прочитати файл: решту робить Flue.
const text = readFileSync(new URL('../skills/standup/SKILL.md', import.meta.url), 'utf8');
const description = /^description: (.+)$/m.exec(text)?.[1];
if (!description) {
  throw new Error('Немає description у skills/standup/SKILL.md');
}

export const standup = defineSkill({
  name: 'standup',
  description,
  // Модель отримає цей текст лише після activate_skill. Заголовок між --- прибираємо.
  instructions: text.replace(/^---[\s\S]*?---\s*/, ''),
});
```

</details>

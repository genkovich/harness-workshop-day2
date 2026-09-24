# 00. Підготовка

[Усі етапи](README.md) · [Далі: агент і памʼять](01-model.md)

## Що робимо й навіщо

**До заняття встанови Node.js і Git, створи Telegram-бота й підготуй API-ключ моделі. Репозиторій клонуватимемо разом на початку воркшопу.** Бота краще створити вдома: коли три десятки людей реєструють ботів з одного Wi-Fi, Telegram може тимчасово заблокувати реєстрацію.

Виділи до 20 хвилин. Node.js і Git у тебе вже мають бути з першого дня.

## 1. Node.js і Git

Потрібен Node.js 22.19+ або 24.11+, ми перевіряли на 26.9.0. Якщо ставив усе до першого дня, нічого робити не треба. Інакше скористайся [інструкцією першого дня](https://github.com/genkovich/harness-workshop/blob/start/runbooks/00-start.md).

```bash
node --version
git --version
```

## 2. Telegram-бот

1. Відкрий [@BotFather](https://t.me/BotFather) і надішли `/newbot`.
2. Придумай назву і username, який закінчується на `bot`.
3. BotFather надішле токен виду `123456789:AA...`. Збережи його в менеджері паролів. Токен дає повний контроль над ботом, у чат його не кидай.

[Офіційна інструкція Telegram](https://core.telegram.org/bots/tutorial#obtain-your-bot-token).

## 3. Ключ моделі

Беремо ті самі моделі, що й учора. За замовчуванням це Qwen 3.8 на Groq Free і твій ключ `GROQ_API_KEY` з першого дня, нових реєстрацій не треба. Якщо вчора працював з іншим провайдером, візьми його рядок із таблиці.

| Провайдер | `MODEL` у `.env` | Змінна для ключа |
|---|---|---|
| Groq, як учора | `groq/qwen/qwen3.8-27b` | `GROQ_API_KEY` |
| OpenAI | `openai/gpt-4.1-mini` | `OPENAI_API_KEY` |
| Anthropic | `anthropic/claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| OpenRouter | `openrouter/openai/gpt-4.1-mini` | `OPENROUTER_API_KEY` |

`MODEL` має формат `провайдер/модель`. Частина до першої `/` каже Flue, до якого сервісу йти, решта і є назвою моделі в цьому сервісі. Для Groq це `qwen/qwen3.8-27b`, та сама назва, що вчора стояла в `GROQ_MODEL`.

Qwen 3.8 зʼявився в Groq пізніше, ніж вийшла наша версія Flue, і Flue його ще не знає. Тому в `start` уже лежить `src/models.ts`: він додає цю модель у каталог Groq. Grok 4.7 з першого дня Flue теж не знає, а xAI публікує не всі дані цієї моделі, тож її ми не додавали. Якщо вчора був Grok, сьогодні візьми Groq.

**Ліміти Groq Free** ті самі, що вчора: 30 запитів і 8 000 токенів на хвилину, 200 000 токенів на добу. Flue щоразу шле моделі інструкцію, описи тулів і всю історію розмови, тож один хід бота коштує від двох до пʼяти тисяч токенів. Пиши боту приблизно одне повідомлення на хвилину. Якщо відповідь не прийшла за 20 секунд, Flue чекає на квоту і повторить запит сам.

**До заняття все готово, якщо** є версії Node і Git, збережений токен бота і ключ моделі.

## На воркшопі: клонуємо проєкт

```bash
git clone --branch start https://github.com/genkovich/harness-workshop-day2.git
cd harness-workshop-day2
npm ci
git switch -c work-01
```

`npm ci` ставить залежності з `package-lock.json` і створює `.env` з `.env.example`, якщо файла ще немає. Відкрий `.env`: `MODEL` уже стоїть, заповни ключ і токен:

```bash
MODEL=groq/qwen/qwen3.8-27b
GROQ_API_KEY=твій-ключ-із-першого-дня
TELEGRAM_BOT_TOKEN=токен-від-BotFather
```

Якщо обрав іншого провайдера, зміни `MODEL` і заповни його змінну з таблиці. `OWNER_CHAT_ID` поки лишаємо порожнім, він знадобиться на етапі 04. Файл `.env` не потрапляє в Git.

## Пакети коротко

- `@flue/runtime` виконує агента: цикл, історію, виклик тулів, skills.
- `@flue/cli` дає команду `flue run`: одне повідомлення агенту прямо з термінала.
- `grammy` отримує повідомлення з Telegram і надсилає відповіді.
- `valibot` описує й перевіряє аргументи тулів. Учора цю роль виконував Zod; Flue приймає Valibot.
- `tsx` запускає TypeScript без збірки, `typescript` перевіряє типи.
- `@earendil-works/pi-ai` це шар моделей усередині Flue. Звідти беремо скриптовану модель для тестів і каталог Groq для `src/models.ts`.

## Перевірка

```bash
npm run check
npm test -- --test-name-pattern "^00 "
npm run setup:check
```

`npm run check` перевіряє типи, тест `00` дивиться, що всі ранбуки на місці. Ці дві команди не ходять у мережу.

`npm run setup:check` робить справжні запити: питає Telegram, чи дійсний токен, і просить модель один раз викликати тестовий тул через Flue. Очікуємо:

```text
Telegram: бот @твій_бот на звʼязку.
Модель groq/qwen/qwen3.8-27b: ключ працює, тул викликано.
Усе готово до практики.
```

## Якщо щось не працює

| Що бачиш | Що зробити |
|---|---|
| Немає `.env` | Виконай `npm run prepare`. На Windows перевір, що файл не називається `.env.txt`. |
| `Telegram не прийняв токен` | Скопіюй токен з BotFather ще раз, без пробілів і лапок. |
| `Provider is not configured` | Ключ порожній або лежить не в тій змінній. Звір назву змінної з таблицею. |
| `Unknown model` | Назва моделі з помилкою. Бери точний рядок з таблиці. Для Qwen 3.8 ще перевір, що `src/models.ts` на місці. |
| `429` або довга пауза | Вичерпано хвилинну квоту. Зачекай хвилину. Не запускай перевірку багато разів поспіль. |
| `413` або `Request too large` | Історія розмови переросла хвилинний ліміт Groq Free. Почни розмову заново: для `npm run ask` видали `node_modules/.cache/flue/run.db`, для бота зупини його (Ctrl+C) і видали `bot.db`. |
| `Модель відповіла, але не викликала тул` | Візьми іншу модель з таблиці, ця погано працює з тулами. |

## Що вже є в `start`

У `src/` лежать два файли. `notes.ts` це наш «застосунок», який зберігає нотатки у `notes.json`. Про агентів і моделі він нічого не знає, до нього ми підключимо агента на етапі 03. `models.ts` додає Qwen 3.8 у каталог Flue, його ми не змінюємо. Скрипт перевірки лежить у [scripts/check-setup.ts](../scripts/check-setup.ts), skill для стендапу в [skills/standup/SKILL.md](../skills/standup/SKILL.md).

Після успішної перевірки відкрий [етап 01](01-model.md).

## Готовий код

Файли, які вже є в `start`. Інші файли зʼявляться на наступних етапах.

<details>
<summary>src/notes.ts</summary>

```ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Звичайний код застосунку: про модель і Flue цей файл нічого не знає.
export type Note = {
  id: string;
  chatId: string;
  text: string;
  createdAt: string;
};

export const maxNoteCharacters = 2_000;

function notesFile() {
  // Тести підставляють тимчасовий файл через NOTES_FILE.
  return process.env.NOTES_FILE || 'notes.json';
}

export function readNotes(): Note[] {
  if (!existsSync(notesFile())) {
    return [];
  }
  return JSON.parse(readFileSync(notesFile(), 'utf8'));
}

function writeNotes(notes: Note[]) {
  writeFileSync(notesFile(), JSON.stringify(notes, null, 2), 'utf8');
}

export function saveNote(chatId: string, text: string) {
  const note = {
    id: randomUUID(),
    chatId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  writeNotes([...readNotes(), note]);
  return note;
}

export function searchNotes(chatId: string, query = '') {
  const search = query.trim().toLowerCase();
  // Спершу лише свій чат, потім пошук за текстом. Порожній запит повертає всі.
  return readNotes().filter((note) => {
    return note.chatId === chatId && note.text.toLowerCase().includes(search);
  });
}

export function deleteNotes(chatId: string) {
  const notes = readNotes();
  const remaining = notes.filter((note) => note.chatId !== chatId);
  writeNotes(remaining);
  return { deleted: notes.length - remaining.length };
}
```

</details>

<details>
<summary>src/models.ts</summary>

```ts
// Модель першого дня: Qwen 3.8 27B на Groq, той самий ключ GROQ_API_KEY.
// Flue 2.0.6 бере каталог моделей з pi-ai 0.83, а Qwen 3.8 зʼявився в Groq пізніше.
// Flue шукає модель лише в каталозі провайдера, тож додаємо її туди самі.
import { setProvider } from '@flue/runtime';
import type { Model } from '@earendil-works/pi-ai';
import { groqProvider } from '@earendil-works/pi-ai/providers/groq';

export const DEFAULT_MODEL = 'groq/qwen/qwen3.8-27b';

// Дані з https://console.groq.com/docs/model/qwen/qwen3.8-27b
const qwen: Model<'openai-completions'> = {
  id: 'qwen/qwen3.8-27b',
  name: 'Qwen 3.8 27B',
  api: 'openai-completions',
  provider: 'groq',
  baseUrl: 'https://api.groq.com/openai/v1',
  reasoning: true,
  // Рівні міркувань Flue → reasoning_effort у Groq. Без thinkingLevel модель міркує, як учора.
  thinkingLevelMap: { off: 'none', minimal: null, low: 'low', medium: 'medium', high: 'high', xhigh: null, max: null },
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 131072,
  maxTokens: 16384,
  // Шаблон Qwen у Groq не знає ролі developer, тож інструкція має йти як system.
  compat: { supportsDeveloperRole: false },
};

const groq = groqProvider();
setProvider({ ...groq, getModels: () => [...groq.getModels(), qwen] });
```

</details>

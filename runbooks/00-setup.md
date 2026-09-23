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

Обери **одного** провайдера. За замовчуванням беремо Gemini: безкоштовний ключ створюється в [Google AI Studio](https://aistudio.google.com/apikey). Ключ Groq з першого дня теж підійде.

| Провайдер | `MODEL` у `.env` | Змінна для ключа |
|---|---|---|
| Google | `google/gemini-2.5-flash` | `GEMINI_API_KEY` |
| Groq | `groq/openai/gpt-oss-20b` | `GROQ_API_KEY` |
| OpenAI | `openai/gpt-4.1-mini` | `OPENAI_API_KEY` |
| Anthropic | `anthropic/claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| OpenRouter | `openrouter/openai/gpt-4.1-mini` | `OPENROUTER_API_KEY` |
| xAI | `xai/grok-4.3` | `XAI_API_KEY` |

`MODEL` має формат `провайдер/модель`. Частина до першої `/` каже Flue, до якого сервісу йти, решта і є назвою моделі в цьому сервісі. Безкоштовні квоти мають ліміти запитів на хвилину, тож на занятті можливі паузи.

**До заняття все готово, якщо** є версії Node і Git, збережений токен бота і ключ моделі.

## На воркшопі: клонуємо проєкт

```bash
git clone --branch start https://github.com/genkovich/harness-workshop-day2.git
cd harness-workshop-day2
npm ci
git switch -c work-01
```

`npm ci` ставить залежності з `package-lock.json` і створює `.env` з `.env.example`, якщо файла ще немає. Відкрий `.env` і заповни три рядки:

```bash
MODEL=google/gemini-2.5-flash
GEMINI_API_KEY=твій-ключ
TELEGRAM_BOT_TOKEN=токен-від-BotFather
```

Якщо обрав іншого провайдера, зміни `MODEL` і заповни його змінну з таблиці. `OWNER_CHAT_ID` поки лишаємо порожнім, він знадобиться на етапі 04. Файл `.env` не потрапляє в Git.

## Пакети коротко

- `@flue/runtime` виконує агента: цикл, історію, виклик тулів, skills.
- `@flue/cli` дає команду `flue run`: одне повідомлення агенту прямо з термінала.
- `grammy` отримує повідомлення з Telegram і надсилає відповіді.
- `valibot` описує й перевіряє аргументи тулів. Учора цю роль виконував Zod; Flue приймає Valibot.
- `tsx` запускає TypeScript без збірки, `typescript` перевіряє типи.
- `@earendil-works/pi-ai` потрібен лише тестам: це шар моделей всередині Flue, звідти беремо скриптовану модель.

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
Модель google/gemini-2.5-flash: ключ працює, тул викликано.
Усе готово до практики.
```

## Якщо щось не працює

| Що бачиш | Що зробити |
|---|---|
| Немає `.env` | Виконай `npm run prepare`. На Windows перевір, що файл не називається `.env.txt`. |
| `Telegram не прийняв токен` | Скопіюй токен з BotFather ще раз, без пробілів і лапок. |
| `Provider is not configured` | Ключ порожній або лежить не в тій змінній. Звір назву змінної з таблицею. |
| `Unknown model` | Назва моделі з помилкою. Бери точний рядок з таблиці. |
| `429` або довга пауза | Вичерпано хвилинну квоту. Зачекай хвилину. Не запускай перевірку багато разів поспіль. |
| `Модель відповіла, але не викликала тул` | Візьми іншу модель з таблиці, ця погано працює з тулами. |

## Що вже є в `start`

У `src/` лежить лише `notes.ts`: це наш «застосунок», який зберігає нотатки у `notes.json`. Про агентів і моделі він нічого не знає, до нього ми підключимо агента на етапі 03. Скрипт перевірки лежить у [scripts/check-setup.ts](../scripts/check-setup.ts), skill для стендапу в [skills/standup/SKILL.md](../skills/standup/SKILL.md).

Після успішної перевірки відкрий [етап 01](01-model.md).

## Готовий код

Файл, який уже є в `start`. Інші файли зʼявляться на наступних етапах.

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

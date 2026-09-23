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

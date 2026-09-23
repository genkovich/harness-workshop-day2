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

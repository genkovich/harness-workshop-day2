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

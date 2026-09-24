'use agent';

import { useModel, useTool, useResponseFinish, type AgentProps } from '@flue/runtime';
import { saveNoteTool, searchNotesTool, deleteNotesTool } from './tools.ts';
import { isOwner } from './settings.ts';
import { logResponse } from './log.ts';
import { DEFAULT_MODEL } from './models.ts';

// Flue викликає цю функцію перед кожним запитом до моделі. Цикл, історія й виконання тулів на ньому.
export function Assistant({ id }: AgentProps) {
  useModel(process.env.MODEL || DEFAULT_MODEL, { thinkingLevel: 'off' });

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

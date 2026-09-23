'use agent';

import { useModel, useTool, type AgentProps } from '@flue/runtime';

import { toolsForChat } from './tools.ts';

export function Assistant({ id }: AgentProps) {
  // Провайдера та модель задаємо в .env; цикл виконує Flue.
  useModel(process.env.MODEL || 'google/gemini-2.5-flash');

  for (const tool of toolsForChat(id)) {
    useTool(tool);
  }

  // Це інструкція агента. Завдання передамо окремим повідомленням.
  return [
    'Reply in Ukrainian.',
    'Use tools to save and search notes. Do not invent saved facts.',
    'Report success only after a successful tool result.',
  ].join('\n');
}

Assistant.agentName = 'workshop-assistant';

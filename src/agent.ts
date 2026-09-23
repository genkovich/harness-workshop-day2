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

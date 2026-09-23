'use agent';

import { useModel } from '@flue/runtime';

export function Assistant() {
  // Провайдера та модель задаємо в .env; цикл виконує Flue.
  useModel(process.env.MODEL || 'google/gemini-2.5-flash');

  // Це інструкція агента. Завдання передамо окремим повідомленням.
  return 'Reply in Ukrainian. Say when you do not know the answer.';
}

Assistant.agentName = 'workshop-assistant';

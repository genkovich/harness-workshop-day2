'use agent';

import { useModel } from '@flue/runtime';

// Flue викликає цю функцію перед кожним запитом до моделі. Цикл і історія розмови на ньому.
export function Assistant() {
  useModel(process.env.MODEL || 'google/gemini-2.5-flash');

  // Рядок, який повертаємо, стає інструкцією агента (system prompt).
  return [
    'You are a personal notes assistant in Telegram. Reply in Ukrainian, briefly.',
    'Say so when you do not know something.',
  ].join('\n');
}

Assistant.agentName = 'workshop-assistant';

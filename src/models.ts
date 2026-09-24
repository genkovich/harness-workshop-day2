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
  // thinkingLevel 'off' в агенті стає reasoning_effort: none у запиті до Groq.
  thinkingLevelMap: { off: 'none', minimal: null, low: 'low', medium: 'medium', high: 'high', xhigh: null, max: null },
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 131072,
  maxTokens: 16384,
};

const groq = groqProvider();
setProvider({ ...groq, getModels: () => [...groq.getModels(), qwen] });

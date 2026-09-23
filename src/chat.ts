import { init } from '@flue/runtime';
import { Assistant } from './agent.ts';

// Одна розмова = один агент. Id чату стає id агента, тож історія в кожного чату своя.
export async function askAgent(chatId: string, text: string) {
  const agent = init(Assistant, { id: chatId });
  const receipt = await agent.dispatch(text);
  const reply = await agent.read(receipt);

  if (!reply.text.trim()) {
    throw new Error('Модель не повернула текст.');
  }
  return reply.text;
}

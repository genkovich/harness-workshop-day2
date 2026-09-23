// Скриптована модель для тестів: Flue працює по-справжньому, мережі немає.
// Кожна відповідь моделі це функція, яка бачить запит (інструкцію, історію, тули).
import { fauxProvider, fauxAssistantMessage, fauxToolCall, type Context } from '@earendil-works/pi-ai';
import { setProvider } from '@flue/runtime';

const faux = fauxProvider({ provider: 'faux', models: [{ id: 'test' }] });
setProvider(faux.provider);
process.env.MODEL = 'faux/test';

// Що модель отримала в кожному запиті. Тест читає це після відповіді.
export const requests: Context[] = [];

type Step = { text: string } | { tool: string; input: Record<string, unknown> };

export function script(...steps: Step[]) {
  requests.length = 0;
  faux.setResponses(steps.map((step) => (context) => {
    requests.push(context);
    return 'text' in step
      ? fauxAssistantMessage(step.text)
      : fauxAssistantMessage(fauxToolCall(step.tool, step.input), { stopReason: 'toolUse' });
  }));
}

// Назви тулів, які модель бачила в останньому запиті (без службових тулів Flue).
export function toolNames(index = requests.length - 1) {
  const service = new Set(['task', 'activate_skill']);
  return (requests[index]?.tools ?? []).map((tool) => tool.name).filter((name) => !service.has(name));
}

// Текст повідомлень, які модель отримала в запиті.
export function messagesText(index = requests.length - 1) {
  return JSON.stringify(requests[index]?.messages ?? []);
}

// Шаблонний шлях: на ранніх гілках пізніх файлів ще немає, і tsc не має на них падати.
export function load(name: string) {
  return import(`../src/${name}.ts`);
}

let runtime: Promise<unknown> | undefined;

// Flue запускається один раз на файл тестів. База в памʼяті.
export async function startRuntime() {
  runtime ??= (async () => {
    const { start, sqlite } = await import('@flue/runtime/node');
    const { Assistant } = await load('agent');
    return start({ agents: [Assistant], db: sqlite(':memory:') });
  })();
  return runtime;
}

// Надіслати повідомлення агенту з цим id і дочекатися відповіді.
export async function send(id: string, text: string) {
  await startRuntime();
  const { init } = await import('@flue/runtime');
  const { Assistant } = await load('agent');
  const agent = init(Assistant, { id });
  return agent.read(await agent.dispatch(text));
}

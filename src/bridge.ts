// Receipt — квитанція Flue: повʼязуємо відправлення з його відповіддю.
type AgentHandle<Receipt> = {
  dispatch(text: string): Promise<Receipt>;
  read(receipt: Receipt): Promise<{ text: string }>;
};

export async function answer<Receipt>(
  chatId: string,
  text: string,
  makeHandle: (id: string) => AgentHandle<Receipt>,
) {
  const agent = makeHandle(chatId);
  const receipt = await agent.dispatch(text);
  const reply = await agent.read(receipt);

  if (!reply.text.trim()) {
    throw new Error('Модель не повернула текст. Перевір журнал запиту.');
  }

  return reply.text;
}

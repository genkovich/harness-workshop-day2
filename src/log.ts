type Response = {
  toolCalls: readonly { tool: string; isError: boolean }[];
  usage: { totalTokens: number };
};

// Цикл веде Flue, тож кроків ми не бачимо. Після відповіді друкуємо, що сталося насправді.
export function logResponse(response: Response) {
  const line = {
    tools: response.toolCalls.map((call) => (call.isError ? `${call.tool} (помилка)` : call.tool)),
    totalTokens: response.usage.totalTokens,
  };
  console.log(JSON.stringify(line));
}

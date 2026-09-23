type Usage = {
  totalTokens: number;
};

export function reportUsage(usage: Usage) {
  const event = {
    event: 'usage',
    totalTokens: usage.totalTokens,
  };

  console.log(JSON.stringify(event));
}

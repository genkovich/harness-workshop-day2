export function canDeleteNotes(chatId: string) {
  const ownerChatId = process.env.OWNER_CHAT_ID;
  if (!ownerChatId) {
    return false;
  }

  return chatId === ownerChatId;
}

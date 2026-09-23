// Налаштування читає лише код, модель його не бачить. Порожній OWNER_CHAT_ID означає «власника немає».
export function isOwner(chatId: string) {
  const ownerChatId = process.env.OWNER_CHAT_ID;
  return Boolean(ownerChatId) && chatId === ownerChatId;
}

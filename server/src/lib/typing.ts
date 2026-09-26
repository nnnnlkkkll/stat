type Entry = { userId: string; until: number };

const rooms = new Map<string, Entry[]>();

export function setTyping(conversationId: string, userId: string) {
  const until = Date.now() + 4000;
  const list = (rooms.get(conversationId) ?? []).filter((e) => e.userId !== userId && e.until > Date.now());
  list.push({ userId, until });
  rooms.set(conversationId, list);
}

export function typingUserIds(conversationId: string, exceptUserId: string) {
  const now = Date.now();
  const list = (rooms.get(conversationId) ?? []).filter((e) => e.until > now);
  rooms.set(conversationId, list);
  return list.filter((e) => e.userId !== exceptUserId).map((e) => e.userId);
}

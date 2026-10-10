import { prisma } from "../db.js";

export async function setTyping(conversationId: string, userId: string) {
  await prisma.typingIndicator.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    create: { conversationId, userId, expiresAt: new Date(Date.now() + 4000) },
    update: { expiresAt: new Date(Date.now() + 4000) },
  });
}

export async function typingUserIds(conversationId: string, exceptUserId: string) {
  const rows = await prisma.typingIndicator.findMany({
    where: {
      conversationId,
      userId: { not: exceptUserId },
      expiresAt: { gt: new Date() },
    },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

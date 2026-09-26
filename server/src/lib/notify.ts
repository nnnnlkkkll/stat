import { prisma } from "../db.js";

export type NotificationType =
  | "follow"
  | "post_like"
  | "profile_like"
  | "favorite"
  | "comment"
  | "message"
  | "story_reply"
  | "story_react"
  | "friend_request"
  | "friend_accept"
  | "message_react";

export async function notify(input: {
  userId: string;
  actorId: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  if (input.userId === input.actorId) return;

  await prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });
}

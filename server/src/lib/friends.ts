import { prisma } from "../db.js";

export function friendPair(a: string, b: string) {
  return a < b ? { userLowId: a, userHighId: b } : { userLowId: b, userHighId: a };
}

export async function areFriends(a: string, b: string) {
  const pair = friendPair(a, b);
  const row = await prisma.friendship.findUnique({
    where: { userLowId_userHighId: pair },
  });
  return Boolean(row);
}

export type FriendState = "none" | "outgoing" | "incoming" | "friends";

export async function friendState(viewerId: string | undefined, targetId: string): Promise<FriendState> {
  if (!viewerId || viewerId === targetId) return "none";

  if (await areFriends(viewerId, targetId)) return "friends";

  const [out, incoming] = await Promise.all([
    prisma.friendRequest.findUnique({
      where: { fromId_toId: { fromId: viewerId, toId: targetId } },
    }),
    prisma.friendRequest.findUnique({
      where: { fromId_toId: { fromId: targetId, toId: viewerId } },
    }),
  ]);

  if (out) return "outgoing";
  if (incoming) return "incoming";
  return "none";
}

export function isOnline(lastSeenAt?: Date | null, lastLoginAt?: Date | null) {
  const at = lastSeenAt ?? lastLoginAt;
  if (!at) return false;
  return Date.now() - at.getTime() < 8 * 60 * 1000;
}

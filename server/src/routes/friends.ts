import { prisma } from "../db.js";
import { errors } from "../lib/errors.js";
import { areFriends, friendPair, isOnline } from "../lib/friends.js";
import { notify } from "../lib/notify.js";
import { createRouter } from "../lib/router.js";
import { blockedPairIds, publicUser } from "../lib/users.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimit.js";

export const friendsRouter = createRouter();

function withPresence(user: Parameters<typeof publicUser>[0]) {
  return {
    ...publicUser(user),
    online: isOnline(user.lastSeenAt, user.lastLoginAt),
    lastSeenAt: user.lastSeenAt ?? user.lastLoginAt ?? null,
  };
}

friendsRouter.get("/me/friends", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const blocked = await blockedPairIds(me);
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ userLowId: me }, { userHighId: me }] },
    include: {
      userLow: { include: { profile: true } },
      userHigh: { include: { profile: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    users: rows
      .map((row) => (row.userLowId === me ? row.userHigh : row.userLow))
      .filter((user) => !blocked.has(user.id))
      .map(withPresence),
  });
});

friendsRouter.get("/me/friend-requests", requireAuth, async (req, res) => {
  const rows = await prisma.friendRequest.findMany({
    where: { toId: req.user!.id },
    include: { from: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users: rows.map((row) => withPresence(row.from)) });
});

friendsRouter.get("/me/friend-requests/sent", requireAuth, async (req, res) => {
  const rows = await prisma.friendRequest.findMany({
    where: { fromId: req.user!.id },
    include: { to: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users: rows.map((row) => withPresence(row.to)) });
});

friendsRouter.post("/:id/friend", requireAuth, writeLimiter, async (req, res) => {
  const targetId = req.params.id;
  const me = req.user!.id;
  if (targetId === me) throw errors.badRequest("You cannot add yourself.");

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw errors.notFound("User not found.");

  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: me, blockedId: targetId },
        { blockerId: targetId, blockedId: me },
      ],
    },
  });
  if (blocked) throw errors.forbidden("You cannot add this person.");

  if (await areFriends(me, targetId)) throw errors.conflict("You are already friends.");

  const incoming = await prisma.friendRequest.findUnique({
    where: { fromId_toId: { fromId: targetId, toId: me } },
  });
  if (incoming) {
    await prisma.$transaction([
      prisma.friendship.create({ data: friendPair(me, targetId) }),
      prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { fromId: me, toId: targetId },
            { fromId: targetId, toId: me },
          ],
        },
      }),
    ]);
    await notify({
      userId: targetId,
      actorId: me,
      type: "friend_accept",
      entityType: "user",
      entityId: me,
    });
    return res.status(201).json({ ok: true, state: "friends" });
  }

  try {
    await prisma.friendRequest.create({ data: { fromId: me, toId: targetId } });
  } catch (err: unknown) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
      throw errors.conflict("Friend request already sent.");
    }
    throw err;
  }

  await notify({
    userId: targetId,
    actorId: me,
    type: "friend_request",
    entityType: "user",
    entityId: me,
  });

  res.status(201).json({ ok: true, state: "outgoing" });
});

friendsRouter.post("/:id/friend/accept", requireAuth, writeLimiter, async (req, res) => {
  const fromId = req.params.id;
  const me = req.user!.id;
  const incoming = await prisma.friendRequest.findUnique({
    where: { fromId_toId: { fromId, toId: me } },
  });
  if (!incoming) throw errors.notFound("No friend request from them.");

  try {
    await prisma.$transaction([
      prisma.friendship.create({ data: friendPair(me, fromId) }),
      prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { fromId, toId: me },
            { fromId: me, toId: fromId },
          ],
        },
      }),
    ]);
  } catch (err: unknown) {
    if (!(typeof err === "object" && err && "code" in err && err.code === "P2002")) throw err;
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { fromId, toId: me },
          { fromId: me, toId: fromId },
        ],
      },
    });
  }

  await notify({
    userId: fromId,
    actorId: me,
    type: "friend_accept",
    entityType: "user",
    entityId: me,
  });

  res.json({ ok: true, state: "friends" });
});

friendsRouter.post("/:id/friend/decline", requireAuth, async (req, res) => {
  const fromId = req.params.id;
  const incoming = await prisma.friendRequest.findUnique({
    where: { fromId_toId: { fromId, toId: req.user!.id } },
  });
  if (!incoming) throw errors.notFound("No friend request from them.");
  await prisma.friendRequest.delete({ where: { id: incoming.id } });
  res.json({ ok: true, state: "none" });
});

friendsRouter.delete("/:id/friend", requireAuth, async (req, res) => {
  const targetId = req.params.id;
  const me = req.user!.id;
  if (targetId === me) throw errors.badRequest("You cannot do that.");

  const outgoing = await prisma.friendRequest.findUnique({
    where: { fromId_toId: { fromId: me, toId: targetId } },
  });
  if (outgoing) {
    await prisma.friendRequest.delete({ where: { id: outgoing.id } });
    return res.json({ ok: true, state: "none" });
  }

  const pair = friendPair(me, targetId);
  const friendship = await prisma.friendship.findUnique({
    where: { userLowId_userHighId: pair },
  });
  if (!friendship) throw errors.notFound("You are not friends.");

  await prisma.friendship.delete({ where: { userLowId_userHighId: pair } });
  res.json({ ok: true, state: "none" });
});

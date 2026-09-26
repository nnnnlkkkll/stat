import { z } from "zod";
import { createRouter } from "../lib/router.js";
import { prisma } from "../db.js";
import { errors } from "../lib/errors.js";
import { areFriends, isOnline } from "../lib/friends.js";
import { notify } from "../lib/notify.js";
import { parseLimit } from "../lib/pagination.js";
import { pairKey } from "../lib/tokens.js";
import { setTyping, typingUserIds } from "../lib/typing.js";
import { publicUser } from "../lib/users.js";
import { parse } from "../lib/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { messageLimiter } from "../middleware/rateLimit.js";

export const conversationsRouter = createRouter();

const REACTION_TO_KEY: Record<string, string> = {
  "❤️": "heart",
  "❤": "heart",
  "😂": "joy",
  "👍": "up",
  "😭": "cry",
  "😡": "mad",
  "💀": "skull",
};
const KEY_TO_REACTION: Record<string, string> = {
  heart: "❤️",
  joy: "😂",
  up: "👍",
  cry: "😭",
  mad: "😡",
  skull: "💀",
};

function reactionKey(emoji: string) {
  return REACTION_TO_KEY[emoji] ?? null;
}

function reactionEmoji(key: string) {
  return KEY_TO_REACTION[key] ?? key;
}

async function assertMember(conversationId: string, userId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member) throw errors.forbidden("You are not in this conversation.");
  return member;
}

async function canMessage(fromId: string, toId: string) {
  if (fromId === toId) throw errors.badRequest("You cannot message yourself.");

  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: fromId, blockedId: toId },
        { blockerId: toId, blockedId: fromId },
      ],
    },
  });
  if (blocked) throw errors.forbidden("You cannot message this person.");

  const target = await prisma.profile.findUnique({ where: { userId: toId } });
  if (!target) throw errors.notFound("User not found.");

  if (target.allowMessages === "none") {
    throw errors.forbidden("They are not taking messages.");
  }

  if (await areFriends(fromId, toId)) return;

  if (target.allowMessages === "followers") {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId: fromId, followeeId: toId } },
    });
    if (!follow) throw errors.forbidden("Only their followers can message them.");
  }
}

function withOnline(user: Parameters<typeof publicUser>[0]) {
  return {
    ...publicUser(user),
    online: isOnline(user.lastSeenAt, user.lastLoginAt),
  };
}

function reactionSummary(rows: { emoji: string; userId: string }[], me: string) {
  const map = new Map<string, { emoji: string; count: number; mine: boolean }>();
  for (const row of rows) {
    const emoji = reactionEmoji(row.emoji);
    const cur = map.get(emoji) ?? { emoji, count: 0, mine: false };
    cur.count += 1;
    if (row.userId === me) cur.mine = true;
    map.set(emoji, cur);
  }
  return [...map.values()];
}

function serializeMessage(
  m: {
    id: string;
    body: string;
    type: string;
    mediaUrl: string | null;
    duration: number | null;
    editedAt: Date | null;
    deleted: boolean;
    createdAt: Date;
    senderId: string;
    sender: Parameters<typeof publicUser>[0];
    replyTo: { id: string; body: string; senderId: string; sender: { profile: { displayName: string } | null } } | null;
    reactions: { emoji: string; userId: string }[];
  },
  me: string,
  otherReadAt: Date | null,
  otherShowsRead: boolean,
) {
  return {
    id: m.id,
    body: m.deleted ? "" : m.body,
    type: m.deleted ? "deleted" : m.type,
    mediaUrl: m.deleted ? null : m.mediaUrl,
    duration: m.deleted ? null : m.duration,
    editedAt: m.editedAt,
    deleted: m.deleted,
    createdAt: m.createdAt,
    senderId: m.senderId,
    sender: publicUser(m.sender),
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          body: m.replyTo.body,
          senderId: m.replyTo.senderId,
          displayName: m.replyTo.sender.profile?.displayName ?? "them",
        }
      : null,
    reactions: reactionSummary(m.reactions, me),
    read:
      m.senderId === me && otherShowsRead && otherReadAt
        ? otherReadAt.getTime() >= m.createdAt.getTime()
        : false,
  };
}

const messageInclude = {
  sender: { include: { profile: true } },
  replyTo: { include: { sender: { include: { profile: true } } } },
  reactions: true,
} as const;

conversationsRouter.get("/", requireAuth, async (req, res) => {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId: req.user!.id },
    include: {
      conversation: {
        include: {
          members: { include: { user: { include: { profile: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  res.json({
    conversations: memberships.map((m) => {
      const other = m.conversation.members.find((x) => x.userId !== req.user!.id);
      const last = m.conversation.messages[0];
      return {
        id: m.conversation.id,
        updatedAt: m.conversation.updatedAt,
        lastReadAt: m.lastReadAt,
        unread: last ? !m.lastReadAt || last.createdAt > m.lastReadAt : false,
        other: other ? withOnline(other.user) : null,
        lastMessage: last
          ? { id: last.id, body: last.deleted ? "" : last.body, type: last.type, createdAt: last.createdAt, senderId: last.senderId }
          : null,
      };
    }),
  });
});

const startSchema = z.object({
  userId: z.string().min(1),
});

conversationsRouter.post("/", requireAuth, async (req, res) => {
  const body = parse(startSchema, req.body);
  await canMessage(req.user!.id, body.userId);

  const key = pairKey(req.user!.id, body.userId);
  const existing = await prisma.conversation.findUnique({
    where: { pairKey: key },
    include: {
      members: { include: { user: { include: { profile: true } } } },
    },
  });

  if (existing) {
    const other = existing.members.find((m) => m.userId !== req.user!.id);
    return res.json({
      conversation: {
        id: existing.id,
        other: other ? withOnline(other.user) : null,
      },
    });
  }

  const conversation = await prisma.conversation.create({
    data: {
      pairKey: key,
      members: {
        create: [{ userId: req.user!.id }, { userId: body.userId }],
      },
    },
    include: {
      members: { include: { user: { include: { profile: true } } } },
    },
  });

  const other = conversation.members.find((m) => m.userId !== req.user!.id);
  res.status(201).json({
    conversation: {
      id: conversation.id,
      other: other ? withOnline(other.user) : null,
    },
  });
});

conversationsRouter.get("/:id/messages", requireAuth, async (req, res) => {
  await assertMember(req.params.id, req.user!.id);
  const limit = parseLimit(req.query.limit, 40, 80);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

  const meProfile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
  if (meProfile?.readReceipts !== false) {
    await prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId: req.params.id, userId: req.user!.id } },
      data: { lastReadAt: new Date() },
    });
  }

  const [rows, members] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: req.params.id },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.conversationMember.findMany({
      where: { conversationId: req.params.id },
      include: { user: { include: { profile: true } } },
    }),
  ]);

  const other = members.find((m) => m.userId !== req.user!.id);
  const extra = rows.length > limit;
  const page = extra ? rows.slice(0, limit) : rows;
  res.json({
    messages: page.reverse().map((m) =>
      serializeMessage(m, req.user!.id, other?.lastReadAt ?? null, other?.user.profile?.readReceipts !== false),
    ),
    nextCursor: extra ? page[0]?.id ?? null : null,
  });
});

conversationsRouter.post("/:id/read", requireAuth, async (req, res) => {
  await assertMember(req.params.id, req.user!.id);
  const meProfile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
  if (meProfile?.readReceipts === false) {
    return res.json({ ok: true, exposed: false });
  }
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId: req.params.id, userId: req.user!.id } },
    data: { lastReadAt: new Date() },
  });
  res.json({ ok: true, exposed: true });
});

const messageSchema = z.object({
  body: z.string().trim().max(2000, "Message is too long.").optional(),
  type: z.enum(["text", "voice"]).optional(),
  mediaUrl: z.string().max(400).nullable().optional(),
  duration: z.number().int().min(1).max(300).nullable().optional(),
  replyToId: z.string().max(40).nullable().optional(),
});

conversationsRouter.post("/:id/messages", requireAuth, messageLimiter, async (req, res) => {
  await assertMember(req.params.id, req.user!.id);
  const body = parse(messageSchema, req.body);
  const type = body.type ?? "text";
  const text = (body.body ?? "").trim();
  if (type === "text" && !text) throw errors.badRequest("Message cannot be empty.");
  if (type === "voice" && !body.mediaUrl) throw errors.badRequest("Voice note needs audio.");

  const members = await prisma.conversationMember.findMany({
    where: { conversationId: req.params.id },
    include: { user: { include: { profile: true } } },
  });
  const other = members.find((m) => m.userId !== req.user!.id);
  if (other) await canMessage(req.user!.id, other.userId);

  if (body.replyToId) {
    const original = await prisma.message.findFirst({
      where: { id: body.replyToId, conversationId: req.params.id },
    });
    if (!original) throw errors.notFound("That message is gone.");
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId: req.params.id,
        senderId: req.user!.id,
        body: type === "voice" ? "" : text,
        type,
        mediaUrl: type === "voice" ? body.mediaUrl : null,
        duration: type === "voice" ? body.duration ?? null : null,
        replyToId: body.replyToId ?? null,
      },
      include: messageInclude,
    });
    await tx.conversation.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });
    return created;
  });

  if (other) {
    await notify({
      userId: other.userId,
      actorId: req.user!.id,
      type: "message",
      entityType: "conversation",
      entityId: req.params.id,
    });
  }

  res.status(201).json({
    message: serializeMessage(message, req.user!.id, other?.lastReadAt ?? null, other?.user.profile?.readReceipts !== false),
  });
});

const editSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

conversationsRouter.patch("/:id/messages/:mid", requireAuth, async (req, res) => {
  await assertMember(req.params.id, req.user!.id);
  const body = parse(editSchema, req.body);
  const existing = await prisma.message.findFirst({
    where: { id: req.params.mid, conversationId: req.params.id },
  });
  if (!existing) throw errors.notFound("Message not found.");
  if (existing.senderId !== req.user!.id) throw errors.forbidden("You can only edit your messages.");
  if (existing.type !== "text" || existing.deleted) throw errors.badRequest("That message cannot be edited.");

  const message = await prisma.message.update({
    where: { id: existing.id },
    data: { body: body.body, editedAt: new Date() },
    include: messageInclude,
  });
  res.json({ message: serializeMessage(message, req.user!.id, null, false) });
});

conversationsRouter.delete("/:id/messages/:mid", requireAuth, async (req, res) => {
  await assertMember(req.params.id, req.user!.id);
  const existing = await prisma.message.findFirst({
    where: { id: req.params.mid, conversationId: req.params.id },
  });
  if (!existing) throw errors.notFound("Message not found.");
  if (existing.senderId !== req.user!.id) throw errors.forbidden("You can only delete your messages.");

  await prisma.message.update({
    where: { id: existing.id },
    data: { deleted: true, body: "", mediaUrl: null },
  });
  res.json({ ok: true });
});

const reactSchema = z.object({
  emoji: z.string().min(1).max(8),
});

conversationsRouter.post("/:id/messages/:mid/reactions", requireAuth, messageLimiter, async (req, res) => {
  await assertMember(req.params.id, req.user!.id);
  const body = parse(reactSchema, req.body);
  const key = reactionKey(body.emoji);
  if (!key) throw errors.badRequest("That reaction is not allowed.");

  const existing = await prisma.message.findFirst({
    where: { id: req.params.mid, conversationId: req.params.id },
  });
  if (!existing || existing.deleted) throw errors.notFound("Message not found.");

  try {
    await prisma.messageReaction.create({
      data: { messageId: existing.id, userId: req.user!.id, emoji: key },
    });
  } catch (err: unknown) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
      throw errors.conflict("You already reacted with that.");
    }
    throw err;
  }

  if (existing.senderId !== req.user!.id) {
    await notify({
      userId: existing.senderId,
      actorId: req.user!.id,
      type: "message_react",
      entityType: "conversation",
      entityId: req.params.id,
    });
  }

  const reactions = await prisma.messageReaction.findMany({ where: { messageId: existing.id } });
  res.status(201).json({ reactions: reactionSummary(reactions, req.user!.id) });
});

conversationsRouter.delete("/:id/messages/:mid/reactions", requireAuth, async (req, res) => {
  await assertMember(req.params.id, req.user!.id);
  const body = parse(reactSchema, req.body);
  const key = reactionKey(body.emoji);
  if (!key) throw errors.badRequest("That reaction is not allowed.");
  await prisma.messageReaction.deleteMany({
    where: { messageId: req.params.mid, userId: req.user!.id, emoji: key },
  });
  const reactions = await prisma.messageReaction.findMany({ where: { messageId: req.params.mid } });
  res.json({ reactions: reactionSummary(reactions, req.user!.id) });
});

conversationsRouter.post("/:id/typing", requireAuth, async (req, res) => {
  await assertMember(req.params.id, req.user!.id);
  setTyping(req.params.id, req.user!.id);
  res.json({ ok: true });
});

conversationsRouter.get("/:id/typing", requireAuth, async (req, res) => {
  await assertMember(req.params.id, req.user!.id);
  const ids = typingUserIds(req.params.id, req.user!.id);
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, include: { profile: true } })
    : [];
  res.json({
    typing: users.map((u) => ({ id: u.id, username: u.username, displayName: u.profile?.displayName ?? u.username })),
  });
});


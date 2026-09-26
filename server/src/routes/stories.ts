import { z } from "zod";
import { prisma } from "../db.js";
import { errors } from "../lib/errors.js";
import { notify } from "../lib/notify.js";
import { pairKey } from "../lib/tokens.js";
import { blockedPairIds, publicUser } from "../lib/users.js";
import { parse } from "../lib/validate.js";
import { createRouter } from "../lib/router.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimit.js";

export const storiesRouter = createRouter();

const DAY = 24 * 60 * 60 * 1000;

const createSchema = z.object({
  mediaUrl: z.string().min(1, "Add media."),
});

storiesRouter.post("/", requireAuth, writeLimiter, async (req, res) => {
  const body = parse(createSchema, req.body);
  const now = new Date();
  const story = await prisma.story.create({
    data: {
      userId: req.user!.id,
      mediaUrl: body.mediaUrl,
      createdAt: now,
      expiresAt: new Date(now.getTime() + DAY),
    },
  });
  res.status(201).json({ story });
});

storiesRouter.get("/user/:id", async (req, res) => {
  const blocked = await blockedPairIds(req.user?.id);
  if (blocked.has(req.params.id)) return res.json({ stories: [] });

  const stories = await prisma.story.findMany({
    where: { userId: req.params.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { views: true, replies: true } },
    },
  });

  res.json({
    stories: stories.map((s) => ({
      id: s.id,
      mediaUrl: s.mediaUrl,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      viewsCount: s.userId === req.user?.id ? s._count.views : undefined,
      repliesCount: s.userId === req.user?.id ? s._count.replies : undefined,
    })),
  });
});

storiesRouter.post("/:id/view", requireAuth, async (req, res) => {
  const story = await prisma.story.findUnique({ where: { id: req.params.id } });
  if (!story || story.expiresAt <= new Date()) throw errors.notFound("Story not found.");
  if (story.userId === req.user!.id) return res.json({ ok: true });

  await prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId: story.id, viewerId: req.user!.id } },
    update: {},
    create: { storyId: story.id, viewerId: req.user!.id },
  });

  res.json({ ok: true });
});

storiesRouter.get("/:id/viewers", requireAuth, async (req, res) => {
  const story = await prisma.story.findUnique({ where: { id: req.params.id } });
  if (!story) throw errors.notFound("Story not found.");
  if (story.userId !== req.user!.id) throw errors.forbidden("Only the owner can see viewers.");

  const rows = await prisma.storyView.findMany({
    where: { storyId: story.id },
    include: { viewer: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  res.json({
    viewers: rows.map((row) => ({
      viewedAt: row.createdAt,
      user: publicUser(row.viewer),
    })),
  });
});

const replySchema = z.object({
  body: z.string().trim().min(1, "Write something.").max(400),
});

storiesRouter.post("/:id/reply", requireAuth, writeLimiter, async (req, res) => {
  const body = parse(replySchema, req.body);
  const story = await prisma.story.findUnique({ where: { id: req.params.id } });
  if (!story || story.expiresAt <= new Date()) throw errors.notFound("Story not found.");
  if (story.userId === req.user!.id) throw errors.badRequest("You cannot reply to your own story.");

  const reply = await prisma.storyReply.create({
    data: { storyId: story.id, userId: req.user!.id, body: body.body },
  });

  const key = pairKey(req.user!.id, story.userId);
  const existing = await prisma.conversation.findUnique({ where: { pairKey: key } });
  const conversation =
    existing ??
    (await prisma.conversation.create({
      data: {
        pairKey: key,
        members: { create: [{ userId: req.user!.id }, { userId: story.userId }] },
      },
    }));

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: req.user!.id,
      body: `re: story — ${body.body}`,
    },
  });

  await notify({
    userId: story.userId,
    actorId: req.user!.id,
    type: "story_reply",
    entityType: "story",
    entityId: story.id,
  });

  res.status(201).json({ reply: { id: reply.id } });
});

storiesRouter.post("/:id/react", requireAuth, writeLimiter, async (req, res) => {
  const story = await prisma.story.findUnique({ where: { id: req.params.id } });
  if (!story || story.expiresAt <= new Date()) throw errors.notFound("Story not found.");
  if (story.userId === req.user!.id) return res.json({ ok: true });

  await prisma.storyReply.create({
    data: { storyId: story.id, userId: req.user!.id, body: "♥" },
  });

  await notify({
    userId: story.userId,
    actorId: req.user!.id,
    type: "story_react",
    entityType: "story",
    entityId: story.id,
  });

  res.status(201).json({ ok: true });
});

storiesRouter.delete("/:id", requireAuth, async (req, res) => {
  const story = await prisma.story.findUnique({ where: { id: req.params.id } });
  if (!story) throw errors.notFound("Story not found.");
  if (story.userId !== req.user!.id) throw errors.forbidden("You can only delete your own stories.");
  await prisma.story.delete({ where: { id: story.id } });
  res.json({ ok: true });
});

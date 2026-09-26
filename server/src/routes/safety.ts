import { z } from "zod";
import { createRouter } from "../lib/router.js";
import { prisma } from "../db.js";
import { errors } from "../lib/errors.js";
import { friendPair } from "../lib/friends.js";
import { parse } from "../lib/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimit.js";

export const safetyRouter = createRouter();

safetyRouter.post("/users/:id/block", requireAuth, writeLimiter, async (req, res) => {
  const blockedId = req.params.id;
  if (blockedId === req.user!.id) throw errors.badRequest("You cannot block yourself.");

  const target = await prisma.user.findUnique({ where: { id: blockedId } });
  if (!target) throw errors.notFound("User not found.");

  await prisma.$transaction(async (tx) => {
    await tx.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.user!.id, blockedId } },
      update: {},
      create: { blockerId: req.user!.id, blockedId },
    });

    const followA = await tx.follow.findUnique({
      where: { followerId_followeeId: { followerId: req.user!.id, followeeId: blockedId } },
    });
    const followB = await tx.follow.findUnique({
      where: { followerId_followeeId: { followerId: blockedId, followeeId: req.user!.id } },
    });

    if (followA) {
      await tx.follow.delete({
        where: { followerId_followeeId: { followerId: req.user!.id, followeeId: blockedId } },
      });
      await tx.profile.update({
        where: { userId: blockedId },
        data: { followersCount: { decrement: 1 } },
      });
      await tx.profile.update({
        where: { userId: req.user!.id },
        data: { followingCount: { decrement: 1 } },
      });
    }

    if (followB) {
      await tx.follow.delete({
        where: { followerId_followeeId: { followerId: blockedId, followeeId: req.user!.id } },
      });
      await tx.profile.update({
        where: { userId: req.user!.id },
        data: { followersCount: { decrement: 1 } },
      });
      await tx.profile.update({
        where: { userId: blockedId },
        data: { followingCount: { decrement: 1 } },
      });
    }

    await tx.friendRequest.deleteMany({
      where: {
        OR: [
          { fromId: req.user!.id, toId: blockedId },
          { fromId: blockedId, toId: req.user!.id },
        ],
      },
    });
    const pair = friendPair(req.user!.id, blockedId);
    await tx.friendship.deleteMany({
      where: { userLowId: pair.userLowId, userHighId: pair.userHighId },
    });
  });

  res.status(201).json({ ok: true });
});

safetyRouter.delete("/users/:id/block", requireAuth, async (req, res) => {
  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: req.user!.id, blockedId: req.params.id } },
  });
  if (!existing) throw errors.notFound("You have not blocked them.");
  await prisma.block.delete({
    where: { blockerId_blockedId: { blockerId: req.user!.id, blockedId: req.params.id } },
  });
  res.json({ ok: true });
});

const reportSchema = z.object({
  targetId: z.string().min(1),
  reason: z.enum(["spam", "harassment", "impersonation", "hate", "other"]),
  details: z.string().max(800).default(""),
});

safetyRouter.post("/reports", requireAuth, writeLimiter, async (req, res) => {
  const body = parse(reportSchema, req.body);
  if (body.targetId === req.user!.id) throw errors.badRequest("You cannot report yourself.");

  const target = await prisma.user.findUnique({ where: { id: body.targetId } });
  if (!target) throw errors.notFound("User not found.");

  const report = await prisma.report.create({
    data: {
      reporterId: req.user!.id,
      targetId: body.targetId,
      reason: body.reason,
      details: body.details,
    },
  });

  res.status(201).json({ report: { id: report.id } });
});

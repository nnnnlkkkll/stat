import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { errors } from "../lib/errors.js";
import { notify } from "../lib/notify.js";
import { parseLimit } from "../lib/pagination.js";
import { createRouter } from "../lib/router.js";
import { friendState } from "../lib/friends.js";
import { appUrl, sendMail } from "../lib/mail.js";
import { issueAuthToken } from "../lib/authTokens.js";
import { meUser } from "../lib/me.js";
import { blockedPairIds, publicUser } from "../lib/users.js";
import { recordProfileView } from "../lib/views.js";
import {
  bioSchema,
  displayNameSchema,
  emailSchema,
  hexColorSchema,
  layoutConfigSchema,
  linksSchema,
  parse,
  usernameSchema,
} from "../lib/validate.js";
import { normalizeHandle } from "../lib/username.js";
import { requireAuth } from "../middleware/auth.js";
import { searchLimiter, writeLimiter } from "../middleware/rateLimit.js";

export const usersRouter = createRouter();

async function viewerFlags(viewerId: string | undefined, targetId: string) {
  if (!viewerId || viewerId === targetId) {
    return {
      isSelf: viewerId === targetId,
      isFollowing: false,
      isFavorited: false,
      hasLiked: false,
      isBlocked: false,
      friendship: "none" as const,
    };
  }

  const [follow, favorite, like, block, friendship] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId: viewerId, followeeId: targetId } },
    }),
    prisma.favorite.findUnique({
      where: { userId_targetId: { userId: viewerId, targetId } },
    }),
    prisma.profileLike.findUnique({
      where: { likerId_targetId: { likerId: viewerId, targetId } },
    }),
    prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetId },
          { blockerId: targetId, blockedId: viewerId },
        ],
      },
    }),
    friendState(viewerId, targetId),
  ]);

  return {
    isSelf: false,
    isFollowing: Boolean(follow),
    isFavorited: Boolean(favorite),
    hasLiked: Boolean(like),
    isBlocked: Boolean(block),
    friendship,
  };
}

usersRouter.get("/search", searchLimiter, async (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const limit = parseLimit(req.query.limit, 12, 30);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

  if (q.length < 1) {
    return res.json({ users: [], nextCursor: null });
  }

  const blocked = await blockedPairIds(req.user?.id);

  const rows = await prisma.user.findMany({
    where: {
      id: blocked.size ? { notIn: [...blocked] } : undefined,
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { profile: { displayName: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { profile: true },
    orderBy: { username: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const extra = rows.length > limit;
  const page = extra ? rows.slice(0, limit) : rows;
  res.json({
    users: page.map(publicUser),
    nextCursor: extra ? page[page.length - 1]?.id ?? null : null,
  });
});

usersRouter.get("/:username", async (req, res) => {
  const username = normalizeHandle(req.params.username);
  if (!username) throw errors.notFound("No one uses that name.");

  const user = await prisma.user.findUnique({
    where: { username },
    include: { profile: true },
  });
  if (!user || user.username !== username) throw errors.notFound("No one uses that name.");

  const flags = await viewerFlags(req.user?.id, user.id);
  if (flags.isBlocked) throw errors.notFound("No one uses that name.");

  await recordProfileView(user.id, req.user?.id, req.ip);

  const [fresh, activeStories] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { profile: true },
    }),
    prisma.story.count({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
    }),
  ]);

  res.json({
    user: publicUser(fresh),
    viewer: flags,
    hasActiveStory: activeStories > 0,
  });
});

const profilePatchSchema = z.object({
  displayName: displayNameSchema.optional(),
  bio: bioSchema.optional(),
  links: linksSchema.optional(),
  theme: z.enum(["default", "compact", "stacked"]).optional(),
  accentColor: hexColorSchema.optional(),
  layout: z.enum(["classic", "wide", "zine"]).optional(),
  layoutConfig: layoutConfigSchema.optional(),
  avatarUrl: z.string().max(400).nullable().optional(),
  bannerUrl: z.string().max(400).nullable().optional(),
});

usersRouter.patch("/me/profile", requireAuth, async (req, res) => {
  const body = parse(profilePatchSchema, req.body);
  const profile = await prisma.profile.update({
    where: { userId: req.user!.id },
    data: {
      displayName: body.displayName,
      bio: body.bio,
      links: body.links,
      theme: body.theme,
      accentColor: body.accentColor,
      layout: body.layout,
      layoutConfig: body.layoutConfig as Prisma.InputJsonValue | undefined,
      avatarUrl: body.avatarUrl === undefined ? undefined : body.avatarUrl,
      bannerUrl: body.bannerUrl === undefined ? undefined : body.bannerUrl,
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.id },
    include: { profile: true },
  });

  res.json({ user: publicUser(user), profile });
});

const accountPatchSchema = z.object({
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
  isPrivate: z.boolean().optional(),
  showLikes: z.boolean().optional(),
  allowMessages: z.enum(["everyone", "followers", "none"]).optional(),
  readReceipts: z.boolean().optional(),
});

usersRouter.patch("/me/account", requireAuth, async (req, res) => {
  const body = parse(accountPatchSchema, req.body);

  if (body.username && body.username !== req.user!.username) {
    const taken = await prisma.user.findUnique({ where: { username: body.username } });
    if (taken) throw errors.conflict("That username is taken.");
  }
  if (body.email && body.email !== req.user!.email) {
    const taken = await prisma.user.findUnique({ where: { email: body.email } });
    if (taken) throw errors.conflict("That email is already in use.");
  }

  const user = await prisma.$transaction(async (tx) => {
    if (body.username || body.email) {
      await tx.user.update({
        where: { id: req.user!.id },
        data: {
          username: body.username,
          email: body.email,
          ...(body.email && body.email !== req.user!.email ? { emailVerifiedAt: null } : {}),
        },
      });
    }

    if (
      body.isPrivate !== undefined ||
      body.showLikes !== undefined ||
      body.allowMessages ||
      body.readReceipts !== undefined
    ) {
      await tx.profile.update({
        where: { userId: req.user!.id },
        data: {
          isPrivate: body.isPrivate,
          showLikes: body.showLikes,
          allowMessages: body.allowMessages,
          readReceipts: body.readReceipts,
        },
      });
    }

    return tx.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: { profile: true },
    });
  });

  if (body.email && body.email !== req.user!.email) {
    const raw = await issueAuthToken(user.id, "email_verify", 24);
    await sendMail({
      to: user.email,
      subject: "Confirm your new stat email",
      text: `Confirm this email for @${user.username}:\n${appUrl(`/verify?token=${raw}`)}\n`,
    });
  }

  res.json({
    user: meUser(user),
  });
});

usersRouter.delete("/me", requireAuth, async (req, res) => {
  await prisma.user.delete({ where: { id: req.user!.id } });
  res.clearCookie("stat_sid", { path: "/" });
  res.clearCookie("ick_sid", { path: "/" });
  res.json({ ok: true });
});

usersRouter.post("/:id/follow", requireAuth, writeLimiter, async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user!.id) throw errors.badRequest("You cannot follow yourself.");

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw errors.notFound("User not found.");

  try {
    await prisma.$transaction([
      prisma.follow.create({
        data: { followerId: req.user!.id, followeeId: targetId },
      }),
      prisma.profile.update({
        where: { userId: targetId },
        data: { followersCount: { increment: 1 } },
      }),
      prisma.profile.update({
        where: { userId: req.user!.id },
        data: { followingCount: { increment: 1 } },
      }),
    ]);
  } catch (err: unknown) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
      throw errors.conflict("You already follow them.");
    }
    throw err;
  }

  await notify({
    userId: targetId,
    actorId: req.user!.id,
    type: "follow",
    entityType: "user",
    entityId: req.user!.id,
  });

  res.status(201).json({ ok: true });
});

usersRouter.delete("/:id/follow", requireAuth, async (req, res) => {
  const targetId = req.params.id;
  const existing = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId: req.user!.id, followeeId: targetId } },
  });
  if (!existing) throw errors.notFound("You do not follow them.");

  await prisma.$transaction([
    prisma.follow.delete({
      where: { followerId_followeeId: { followerId: req.user!.id, followeeId: targetId } },
    }),
    prisma.profile.update({
      where: { userId: targetId },
      data: { followersCount: { decrement: 1 } },
    }),
    prisma.profile.update({
      where: { userId: req.user!.id },
      data: { followingCount: { decrement: 1 } },
    }),
  ]);

  res.json({ ok: true });
});

usersRouter.post("/:id/favorite", requireAuth, writeLimiter, async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user!.id) throw errors.badRequest("You cannot favorite yourself.");

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw errors.notFound("User not found.");

  try {
    await prisma.$transaction([
      prisma.favorite.create({
        data: { userId: req.user!.id, targetId },
      }),
      prisma.profile.update({
        where: { userId: targetId },
        data: { favoritesCount: { increment: 1 } },
      }),
    ]);
  } catch (err: unknown) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
      throw errors.conflict("Already in your favorites.");
    }
    throw err;
  }

  await notify({
    userId: targetId,
    actorId: req.user!.id,
    type: "favorite",
    entityType: "user",
    entityId: req.user!.id,
  });

  res.status(201).json({ ok: true });
});

usersRouter.delete("/:id/favorite", requireAuth, async (req, res) => {
  const targetId = req.params.id;
  const existing = await prisma.favorite.findUnique({
    where: { userId_targetId: { userId: req.user!.id, targetId } },
  });
  if (!existing) throw errors.notFound("Not in your favorites.");

  await prisma.$transaction([
    prisma.favorite.delete({
      where: { userId_targetId: { userId: req.user!.id, targetId } },
    }),
    prisma.profile.update({
      where: { userId: targetId },
      data: { favoritesCount: { decrement: 1 } },
    }),
  ]);

  res.json({ ok: true });
});

usersRouter.post("/:id/like", requireAuth, writeLimiter, async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user!.id) throw errors.badRequest("You cannot like yourself.");

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw errors.notFound("User not found.");

  try {
    await prisma.$transaction([
      prisma.profileLike.create({
        data: { likerId: req.user!.id, targetId },
      }),
      prisma.profile.update({
        where: { userId: targetId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
  } catch (err: unknown) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
      throw errors.conflict("You already liked this profile.");
    }
    throw err;
  }

  await notify({
    userId: targetId,
    actorId: req.user!.id,
    type: "profile_like",
    entityType: "user",
    entityId: req.user!.id,
  });

  res.status(201).json({ ok: true });
});

usersRouter.delete("/:id/like", requireAuth, async (req, res) => {
  const targetId = req.params.id;
  const existing = await prisma.profileLike.findUnique({
    where: { likerId_targetId: { likerId: req.user!.id, targetId } },
  });
  if (!existing) throw errors.notFound("You have not liked this profile.");

  await prisma.$transaction([
    prisma.profileLike.delete({
      where: { likerId_targetId: { likerId: req.user!.id, targetId } },
    }),
    prisma.profile.update({
      where: { userId: targetId },
      data: { likesCount: { decrement: 1 } },
    }),
  ]);

  res.json({ ok: true });
});

usersRouter.get("/:id/followers", async (req, res) => {
  const limit = parseLimit(req.query.limit, 20, 50);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const blocked = await blockedPairIds(req.user?.id);

  const rows = await prisma.follow.findMany({
    where: {
      followeeId: req.params.id,
      followerId: blocked.size ? { notIn: [...blocked] } : undefined,
    },
    include: { follower: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { followerId_followeeId: { followerId: cursor, followeeId: req.params.id } }, skip: 1 } : {}),
  });

  const extra = rows.length > limit;
  const page = extra ? rows.slice(0, limit) : rows;
  res.json({
    users: page.map((row) => publicUser(row.follower)),
    nextCursor: extra ? page[page.length - 1]?.followerId ?? null : null,
  });
});

usersRouter.get("/:id/following", async (req, res) => {
  const limit = parseLimit(req.query.limit, 20, 50);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const blocked = await blockedPairIds(req.user?.id);

  const rows = await prisma.follow.findMany({
    where: {
      followerId: req.params.id,
      followeeId: blocked.size ? { notIn: [...blocked] } : undefined,
    },
    include: { followee: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { followerId_followeeId: { followerId: req.params.id, followeeId: cursor } }, skip: 1 } : {}),
  });

  const extra = rows.length > limit;
  const page = extra ? rows.slice(0, limit) : rows;
  res.json({
    users: page.map((row) => publicUser(row.followee)),
    nextCursor: extra ? page[page.length - 1]?.followeeId ?? null : null,
  });
});

usersRouter.get("/me/favorites", requireAuth, async (req, res) => {
  const limit = parseLimit(req.query.limit, 20, 50);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

  const rows = await prisma.favorite.findMany({
    where: { userId: req.user!.id },
    include: { target: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor
      ? { cursor: { userId_targetId: { userId: req.user!.id, targetId: cursor } }, skip: 1 }
      : {}),
  });

  const extra = rows.length > limit;
  const page = extra ? rows.slice(0, limit) : rows;
  res.json({
    users: page.map((row) => publicUser(row.target)),
    nextCursor: extra ? page[page.length - 1]?.targetId ?? null : null,
  });
});

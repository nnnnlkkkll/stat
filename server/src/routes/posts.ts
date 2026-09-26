import { z } from "zod";
import { createRouter } from "../lib/router.js";
import { prisma } from "../db.js";
import { errors } from "../lib/errors.js";
import { notify } from "../lib/notify.js";
import { parseLimit } from "../lib/pagination.js";
import { blockedPairIds, publicUser } from "../lib/users.js";
import { parse } from "../lib/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimit.js";

export const postsRouter = createRouter();

const createSchema = z.object({
  caption: z.string().max(500, "Caption must be 500 characters or fewer.").default(""),
  mediaUrl: z.string().min(1, "Add an image."),
  type: z.enum(["image", "video"]).default("image"),
});

function serializePost(post: {
  id: string;
  type: string;
  mediaUrl: string | null;
  caption: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
  user: Parameters<typeof publicUser>[0];
}, liked: boolean) {
  return {
    id: post.id,
    type: post.type,
    mediaUrl: post.mediaUrl,
    caption: post.caption,
    createdAt: post.createdAt,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    liked,
    author: publicUser(post.user),
  };
}

postsRouter.post("/", requireAuth, writeLimiter, async (req, res) => {
  const body = parse(createSchema, req.body);
  const post = await prisma.post.create({
    data: {
      userId: req.user!.id,
      caption: body.caption,
      mediaUrl: body.mediaUrl,
      type: body.type,
    },
    include: { user: { include: { profile: true } } },
  });
  res.status(201).json({ post: serializePost(post, false) });
});

postsRouter.get("/user/:id", async (req, res) => {
  const limit = parseLimit(req.query.limit, 12, 30);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const blocked = await blockedPairIds(req.user?.id);
  if (blocked.has(req.params.id)) {
    return res.json({ posts: [], nextCursor: null });
  }

  const target = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { profile: true },
  });
  if (!target) throw errors.notFound("User not found.");

  if (target.profile?.isPrivate && req.user?.id !== target.id) {
    const follows = req.user
      ? await prisma.follow.findUnique({
          where: { followerId_followeeId: { followerId: req.user.id, followeeId: target.id } },
        })
      : null;
    if (!follows) return res.json({ posts: [], nextCursor: null, private: true });
  }

  const rows = await prisma.post.findMany({
    where: { userId: req.params.id },
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const extra = rows.length > limit;
  const page = extra ? rows.slice(0, limit) : rows;
  const likedIds = req.user
    ? new Set(
        (
          await prisma.postLike.findMany({
            where: { userId: req.user.id, postId: { in: page.map((p) => p.id) } },
            select: { postId: true },
          })
        ).map((l) => l.postId),
      )
    : new Set<string>();

  res.json({
    posts: page.map((post) => serializePost(post, likedIds.has(post.id))),
    nextCursor: extra ? page[page.length - 1]?.id ?? null : null,
  });
});

postsRouter.get("/:id", async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: { user: { include: { profile: true } } },
  });
  if (!post) throw errors.notFound("Post not found.");

  const blocked = await blockedPairIds(req.user?.id);
  if (blocked.has(post.userId)) throw errors.notFound("Post not found.");

  const liked = req.user
    ? Boolean(
        await prisma.postLike.findUnique({
          where: { userId_postId: { userId: req.user.id, postId: post.id } },
        }),
      )
    : false;

  res.json({ post: serializePost(post, liked) });
});

postsRouter.delete("/:id", requireAuth, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw errors.notFound("Post not found.");
  if (post.userId !== req.user!.id) throw errors.forbidden("You can only delete your own posts.");
  await prisma.post.delete({ where: { id: post.id } });
  res.json({ ok: true });
});

postsRouter.post("/:id/like", requireAuth, writeLimiter, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw errors.notFound("Post not found.");

  try {
    await prisma.$transaction([
      prisma.postLike.create({ data: { userId: req.user!.id, postId: post.id } }),
      prisma.post.update({
        where: { id: post.id },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
  } catch (err: unknown) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
      throw errors.conflict("Already liked.");
    }
    throw err;
  }

  await notify({
    userId: post.userId,
    actorId: req.user!.id,
    type: "post_like",
    entityType: "post",
    entityId: post.id,
  });

  res.status(201).json({ ok: true });
});

postsRouter.delete("/:id/like", requireAuth, async (req, res) => {
  const existing = await prisma.postLike.findUnique({
    where: { userId_postId: { userId: req.user!.id, postId: req.params.id } },
  });
  if (!existing) throw errors.notFound("You have not liked this post.");

  await prisma.$transaction([
    prisma.postLike.delete({
      where: { userId_postId: { userId: req.user!.id, postId: req.params.id } },
    }),
    prisma.post.update({
      where: { id: req.params.id },
      data: { likesCount: { decrement: 1 } },
    }),
  ]);

  res.json({ ok: true });
});

const commentSchema = z.object({
  body: z.string().trim().min(1, "Write something.").max(400, "Comment is too long."),
});

postsRouter.get("/:id/comments", async (req, res) => {
  const limit = parseLimit(req.query.limit, 20, 50);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw errors.notFound("Post not found.");

  const rows = await prisma.comment.findMany({
    where: { postId: post.id },
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const extra = rows.length > limit;
  const page = extra ? rows.slice(0, limit) : rows;
  res.json({
    comments: page.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      author: publicUser(c.user),
    })),
    nextCursor: extra ? page[page.length - 1]?.id ?? null : null,
  });
});

postsRouter.post("/:id/comments", requireAuth, writeLimiter, async (req, res) => {
  const body = parse(commentSchema, req.body);
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw errors.notFound("Post not found.");

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { postId: post.id, userId: req.user!.id, body: body.body },
      include: { user: { include: { profile: true } } },
    });
    await tx.post.update({
      where: { id: post.id },
      data: { commentsCount: { increment: 1 } },
    });
    return created;
  });

  await notify({
    userId: post.userId,
    actorId: req.user!.id,
    type: "comment",
    entityType: "post",
    entityId: post.id,
  });

  res.status(201).json({
    comment: {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      author: publicUser(comment.user),
    },
  });
});

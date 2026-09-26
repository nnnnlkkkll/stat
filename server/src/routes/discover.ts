import { prisma } from "../db.js";
import { parseLimit } from "../lib/pagination.js";
import { createRouter } from "../lib/router.js";
import { blockedPairIds, publicUser } from "../lib/users.js";
import { requireAuth } from "../middleware/auth.js";

export const discoverRouter = createRouter();

// Deterministic order: newest accounts first, then username.
// Cursor is the last seen user id. No recommendation model.
discoverRouter.get("/", requireAuth, async (req, res) => {
  const limit = parseLimit(req.query.limit, 4, 10);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const blocked = await blockedPairIds(req.user!.id);

  const rows = await prisma.user.findMany({
    where: {
      id: {
        not: req.user!.id,
        ...(blocked.size ? { notIn: [...blocked] } : {}),
      },
      profile: { isPrivate: false },
    },
    include: { profile: true },
    orderBy: [{ createdAt: "desc" }, { username: "asc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const extra = rows.length > limit;
  const page = extra ? rows.slice(0, limit) : rows;

  const ids = page.map((u) => u.id);
  const [follows, favorites, likes, stories] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: req.user!.id, followeeId: { in: ids } },
      select: { followeeId: true },
    }),
    prisma.favorite.findMany({
      where: { userId: req.user!.id, targetId: { in: ids } },
      select: { targetId: true },
    }),
    prisma.profileLike.findMany({
      where: { likerId: req.user!.id, targetId: { in: ids } },
      select: { targetId: true },
    }),
    prisma.story.findMany({
      where: { userId: { in: ids }, expiresAt: { gt: new Date() } },
      select: { userId: true },
    }),
  ]);

  const following = new Set(follows.map((f) => f.followeeId));
  const favorited = new Set(favorites.map((f) => f.targetId));
  const liked = new Set(likes.map((l) => l.targetId));
  const withStory = new Set(stories.map((s) => s.userId));

  res.json({
    items: page.map((user) => ({
      user: publicUser(user),
      viewer: {
        isFollowing: following.has(user.id),
        isFavorited: favorited.has(user.id),
        hasLiked: liked.has(user.id),
      },
      hasActiveStory: withStory.has(user.id),
    })),
    nextCursor: extra ? page[page.length - 1]?.id ?? null : null,
  });
});

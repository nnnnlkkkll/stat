import { prisma } from "../db.js";
import { parseLimit } from "../lib/pagination.js";
import { createRouter } from "../lib/router.js";
import { publicUser } from "../lib/users.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationsRouter = createRouter();

notificationsRouter.get("/", requireAuth, async (req, res) => {
  const limit = parseLimit(req.query.limit, 20, 50);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

  const rows = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    include: { actor: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const extra = rows.length > limit;
  const page = extra ? rows.slice(0, limit) : rows;
  const unread = await prisma.notification.count({
    where: { userId: req.user!.id, read: false },
  });

  res.json({
    unread,
    notifications: page.map((n) => ({
      id: n.id,
      type: n.type,
      entityType: n.entityType,
      entityId: n.entityId,
      read: n.read,
      createdAt: n.createdAt,
      actor: n.actor ? publicUser(n.actor) : null,
    })),
    nextCursor: extra ? page[page.length - 1]?.id ?? null : null,
  });
});

notificationsRouter.post("/read", requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true },
  });
  res.json({ ok: true });
});

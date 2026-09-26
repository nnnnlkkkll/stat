import { prisma } from "../db.js";

export async function recordProfileView(profileUserId: string, viewerId: string | undefined, ip?: string) {
  if (viewerId && viewerId === profileUserId) return;

  const viewerKey = viewerId ? `u:${viewerId}` : `ip:${(ip || "anon").slice(0, 80)}`;
  const day = new Date().toISOString().slice(0, 10);

  try {
    await prisma.profileView.create({
      data: { profileUserId, viewerKey, day },
    });
    await prisma.profile.update({
      where: { userId: profileUserId },
      data: { viewsCount: { increment: 1 } },
    });
  } catch (err: unknown) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") return;
    throw err;
  }
}

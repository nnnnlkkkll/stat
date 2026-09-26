import { profileBadges } from "./badges.js";
import { prisma } from "../db.js";

export async function blockedPairIds(viewerId?: string): Promise<Set<string>> {
  if (!viewerId) return new Set();

  const rows = await prisma.block.findMany({
    where: {
      OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
    },
    select: { blockerId: true, blockedId: true },
  });

  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.blockerId === viewerId ? row.blockedId : row.blockerId);
  }
  return ids;
}

export function publicUser(user: {
  id: string;
  username: string;
  createdAt: Date;
  kind?: string;
  lastSeenAt?: Date | null;
  lastLoginAt?: Date | null;
  emailVerifiedAt?: Date | null;
  profile: {
    displayName: string;
    bio: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    links: unknown;
    theme: string;
    accentColor: string;
    layout: string;
    layoutConfig: unknown;
    likesCount: number;
    favoritesCount: number;
    followersCount: number;
    followingCount: number;
    viewsCount?: number;
    isPrivate: boolean;
    showLikes: boolean;
    allowMessages: string;
  } | null;
}) {
  const profile = user.profile;
  if (!profile) {
    throw new Error("User is missing a profile.");
  }

  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
    kind: user.kind ?? "human",
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    bannerUrl: profile.bannerUrl,
    links: profile.links,
    theme: profile.theme,
    accentColor: profile.accentColor,
    layout: profile.layout,
    layoutConfig: profile.layoutConfig,
    likesCount: profile.showLikes ? profile.likesCount : null,
    favoritesCount: profile.favoritesCount,
    followersCount: profile.followersCount,
    followingCount: profile.followingCount,
    viewsCount: profile.viewsCount ?? 0,
    badges: profileBadges(user),
    isPrivate: profile.isPrivate,
    allowMessages: profile.allowMessages,
    lastSeenAt: user.lastSeenAt ?? user.lastLoginAt ?? null,
  };
}

export const userWithProfile = {
  profile: true,
} as const;

import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { errors } from "../lib/errors.js";

const COOKIE = "stat_sid";
const lastSeenBump = new Map<string, number>();

function bumpLastSeen(userId: string) {
  const now = Date.now();
  if ((lastSeenBump.get(userId) ?? 0) + 60_000 > now) return;
  lastSeenBump.set(userId, now);
  void prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
}

export function sessionCookieName(): string {
  return COOKIE;
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) {
      req.user = null;
      return next();
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: { include: { profile: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      req.user = null;
      return next();
    }

    req.user = session.user;
    req.sessionId = session.id;
    bumpLastSeen(session.user.id);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(errors.unauthorized());
  }
  next();
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        passwordHash: string;
        kind: string;
        createdAt: Date;
        updatedAt: Date;
        lastLoginAt: Date | null;
        lastSeenAt: Date | null;
        emailVerifiedAt: Date | null;
        failedLogins: number;
        lockedUntil: Date | null;
        profile: {
          id: string;
          userId: string;
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
          isPrivate: boolean;
          showLikes: boolean;
          allowMessages: string;
          updatedAt: Date;
        } | null;
      } | null;
      sessionId?: string;
    }
  }
}

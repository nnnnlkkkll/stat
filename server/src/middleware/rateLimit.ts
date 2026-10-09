import type { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { prisma } from "../db.js";

function limiter(windowMs: number, max: number, message: string, name: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identity = req.user?.id ?? req.ip ?? "unknown";
      const key = createHash("sha256").update(name + ":" + identity).digest("hex");
      const expires = new Date(Date.now() + windowMs);
      const rows = await prisma.$queryRaw<{ hits: number }[]>`
        INSERT INTO "rate_limit_buckets" ("key", "hits", "reset_at")
        VALUES (\${key}, 1, \${expires})
        ON CONFLICT ("key") DO UPDATE
          SET "hits" = CASE WHEN "rate_limit_buckets"."reset_at" <= now() THEN 1
                             ELSE "rate_limit_buckets"."hits" + 1 END,
              "reset_at" = CASE WHEN "rate_limit_buckets"."reset_at" <= now() THEN EXCLUDED."reset_at"
                                ELSE "rate_limit_buckets"."reset_at" END
        RETURNING "hits"
      `;
      if ((rows[0]?.hits ?? max + 1) > max) {
        res.status(429).json({ error: { code: "RATE_LIMIT", message } });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const authLimiter = limiter(15 * 60 * 1000, 20, "Too many sign-in attempts. Wait a bit.", "auth");
export const writeLimiter = limiter(60 * 1000, 40, "You are posting too quickly.", "write");
export const searchLimiter = limiter(60 * 1000, 40, "Too many searches.", "search");
export const messageLimiter = limiter(60 * 1000, 60, "Too many messages.", "message");

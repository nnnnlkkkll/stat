import rateLimit from "express-rate-limit";

function limiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMIT", message } },
  });
}

export const authLimiter = limiter(15 * 60 * 1000, 20, "Too many sign-in attempts. Wait a bit.");
export const writeLimiter = limiter(60 * 1000, 40, "You are posting too quickly.");
export const searchLimiter = limiter(60 * 1000, 40, "Too many searches.");
export const messageLimiter = limiter(60 * 1000, 60, "Too many messages.");

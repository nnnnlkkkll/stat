import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { consumeAuthToken, issueAuthToken } from "../lib/authTokens.js";
import { errors } from "../lib/errors.js";
import { appUrl, sendMail } from "../lib/mail.js";
import { meUser } from "../lib/me.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";
import { createRouter } from "../lib/router.js";
import { randomToken } from "../lib/tokens.js";
import { publicUser } from "../lib/users.js";
import {
  displayNameSchema,
  emailSchema,
  parse,
  passwordSchema,
  usernameSchema,
} from "../lib/validate.js";
import { requireAuth, sessionCookieName } from "../middleware/auth.js";
import { authLimiter, searchLimiter } from "../middleware/rateLimit.js";

export const authRouter = createRouter();

const DUMMY_HASH = bcrypt.hashSync("stat-dummy-password-not-used", 12);
const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;
const REMEMBER_DAYS = config.sessionDays;
const SESSION_HOURS = 12;

const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

const loginSchema = z.object({
  login: z.string().trim().min(1, "Enter your username or email."),
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean().optional(),
});

function cookieOpts(maxAgeMs?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.isProd,
    path: "/",
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  };
}

function setSessionCookie(res: Response, token: string, maxAgeMs?: number) {
  res.cookie(sessionCookieName(), token, cookieOpts(maxAgeMs));
}

function clearSessionCookie(res: Response) {
  res.clearCookie(sessionCookieName(), { path: "/" });
  res.clearCookie("ick_sid", { path: "/" });
}

async function createSession(userId: string, req: Request, ttlMs: number) {
  const token = randomToken();
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + ttlMs),
      userAgent: req.get("user-agent")?.slice(0, 240),
      ip: req.ip?.slice(0, 80),
    },
  });
  return token;
}

function sessionTtl(remember?: boolean) {
  return remember ? REMEMBER_DAYS * 24 * 60 * 60 * 1000 : SESSION_HOURS * 60 * 60 * 1000;
}

async function sendVerifyMail(user: { id: string; email: string; username: string }) {
  const raw = await issueAuthToken(user.id, "email_verify", 24);
  const url = appUrl(`/verify?token=${raw}`);
  await sendMail({
    to: user.email,
    subject: "Confirm your stat email",
    text: `Hey @${user.username},\n\nConfirm this email for your stat account:\n${url}\n\nThis link expires in 24 hours.\n`,
  });
  return url;
}

async function sendResetMail(user: { id: string; email: string; username: string }) {
  const raw = await issueAuthToken(user.id, "password_reset", 1);
  const url = appUrl(`/reset?token=${raw}`);
  await sendMail({
    to: user.email,
    subject: "Reset your stat password",
    text: `Hey @${user.username},\n\nReset your password here:\n${url}\n\nThis link expires in 1 hour. If you did not ask for this, ignore it.\n`,
  });
  return url;
}

authRouter.get("/username", searchLimiter, async (req, res) => {
  const parsed = usernameSchema.safeParse(String(req.query.username ?? ""));
  if (!parsed.success) {
    return res.json({ available: false, reason: parsed.error.issues[0]?.message ?? "That name is not valid." });
  }
  const taken = await prisma.user.findUnique({ where: { username: parsed.data }, select: { id: true } });
  res.json({ available: !taken });
});

authRouter.post("/register", authLimiter, async (req, res) => {
  const body = parse(registerSchema, req.body);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username: body.username }, { email: body.email }],
    },
  });

  if (existing) {
    if (existing.username === body.username) {
      throw errors.conflict("That username is taken.");
    }
    throw errors.conflict("That email is already in use.");
  }

  const passwordHash = await hashPassword(body.password);
  const user = await prisma.user.create({
    data: {
      username: body.username,
      email: body.email,
      passwordHash,
      lastLoginAt: new Date(),
      profile: {
        create: {
          displayName: body.displayName,
          accentColor: "#ffffff",
          layoutConfig: {
            bgType: "color",
            bgColor: "#0b0b0c",
            textColor: "#f5f5f5",
            font: "sans",
            align: "left",
            badges: ["early"],
            avatarEffect: "none",
            showStats: true,
          },
        },
      },
    },
    include: { profile: true },
  });

  const ttl = sessionTtl(true);
  const token = await createSession(user.id, req, ttl);
  setSessionCookie(res, token, ttl);
  const verifyUrl = await sendVerifyMail(user);
  res.status(201).json({
    user: meUser(user),
    ...(!config.isProd ? { devVerifyUrl: verifyUrl } : {}),
  });
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const body = parse(loginSchema, req.body);
  const login = body.login.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: login }, { email: login }],
    },
    include: { profile: true },
  });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw errors.tooMany("This account is locked. Try again in a few minutes.");
  }

  const ok = await verifyPassword(body.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    if (user) {
      const fails = user.failedLogins + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: fails,
          lockedUntil: fails >= LOCK_AFTER ? new Date(Date.now() + LOCK_MS) : null,
        },
      });
    }
    throw errors.unauthorized("Wrong username/email or password.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null },
  });

  const ttl = sessionTtl(body.remember);
  const token = await createSession(user.id, req, ttl);
  setSessionCookie(res, token, body.remember ? ttl : undefined);
  res.json({ user: meUser(user) });
});

authRouter.post("/logout", async (req, res) => {
  const token = req.cookies?.[sessionCookieName()];
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { profile: true },
  });
  if (!user) throw errors.unauthorized();
  res.json({
    user: meUser(user),
    session: { id: req.sessionId ?? null },
  });
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

authRouter.patch("/password", requireAuth, async (req, res) => {
  const body = parse(passwordChangeSchema, req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
    throw errors.forbidden("Current password is wrong.");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.newPassword), failedLogins: 0, lockedUntil: null },
  });
  if (req.sessionId) {
    await prisma.session.deleteMany({
      where: { userId: user.id, NOT: { id: req.sessionId } },
    });
  }
  res.json({ ok: true });
});

const forgotSchema = z.object({
  email: emailSchema,
});

authRouter.post("/forgot", authLimiter, async (req, res) => {
  const body = parse(forgotSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  let resetUrl: string | undefined;
  if (user) {
    resetUrl = await sendResetMail(user);
  }
  res.json({
    ok: true,
    message: "If that email is on stat, a reset link is on its way.",
    ...(!config.isProd && resetUrl ? { resetUrl } : {}),
  });
});

const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

authRouter.post("/reset", authLimiter, async (req, res) => {
  const body = parse(resetSchema, req.body);
  const token = await consumeAuthToken(body.token, "password_reset");
  if (!token) throw errors.badRequest("That reset link is invalid or expired.");

  await prisma.user.update({
    where: { id: token.userId },
    data: {
      passwordHash: await hashPassword(body.password),
      failedLogins: 0,
      lockedUntil: null,
    },
  });
  await prisma.session.deleteMany({ where: { userId: token.userId } });
  res.json({ ok: true });
});

const verifySchema = z.object({
  token: z.string().min(20).max(200),
});

authRouter.post("/verify-email", authLimiter, async (req, res) => {
  const body = parse(verifySchema, req.body);
  const token = await consumeAuthToken(body.token, "email_verify");
  if (!token) throw errors.badRequest("That confirm link is invalid or expired.");
  const user = await prisma.user.update({
    where: { id: token.userId },
    data: { emailVerifiedAt: new Date() },
    include: { profile: true },
  });
  res.json({ ok: true, user: publicUser(user) });
});

authRouter.post("/verify-email/resend", requireAuth, authLimiter, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw errors.unauthorized();
  if (user.emailVerifiedAt) return res.json({ ok: true, already: true });
  const verifyUrl = await sendVerifyMail(user);
  res.json({
    ok: true,
    ...(!config.isProd ? { devVerifyUrl: verifyUrl } : {}),
  });
});

authRouter.get("/sessions", requireAuth, async (req, res) => {
  const rows = await prisma.session.findMany({
    where: { userId: req.user!.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json({
    sessions: rows.map((row) => ({
      id: row.id,
      current: row.id === req.sessionId,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      userAgent: row.userAgent,
      ip: row.ip,
    })),
  });
});

authRouter.delete("/sessions/:id", requireAuth, async (req, res) => {
  const row = await prisma.session.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!row) throw errors.notFound("Session not found.");
  await prisma.session.delete({ where: { id: row.id } });
  if (row.id === req.sessionId) clearSessionCookie(res);
  res.json({ ok: true, signedOut: row.id === req.sessionId });
});

authRouter.post("/sessions/revoke-others", requireAuth, async (req, res) => {
  if (!req.sessionId) throw errors.unauthorized();
  const result = await prisma.session.deleteMany({
    where: { userId: req.user!.id, NOT: { id: req.sessionId } },
  });
  res.json({ ok: true, revoked: result.count });
});

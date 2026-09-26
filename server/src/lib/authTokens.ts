import crypto from "node:crypto";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { randomToken } from "./tokens.js";

export type AuthTokenType = "email_verify" | "password_reset";

export function hashSecret(value: string) {
  return crypto.createHmac("sha256", config.sessionSecret).update(value).digest("hex");
}

export async function issueAuthToken(userId: string, type: AuthTokenType, hours: number) {
  await prisma.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  const raw = randomToken();
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashSecret(raw),
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    },
  });
  return raw;
}

export async function consumeAuthToken(raw: string, type: AuthTokenType) {
  const token = await prisma.authToken.findUnique({
    where: { tokenHash: hashSecret(raw) },
  });
  if (!token || token.type !== type || token.usedAt || token.expiresAt < new Date()) {
    return null;
  }
  await prisma.authToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });
  return token;
}

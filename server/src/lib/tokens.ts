import crypto from "node:crypto";

export function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

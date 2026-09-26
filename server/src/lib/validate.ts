import { z } from "zod";
import { errors } from "./errors.js";

const reservedNames = new Set([
  "stat",
  "ick",
  "login",
  "join",
  "search",
  "saved",
  "inbox",
  "alerts",
  "new",
  "settings",
  "post",
  "admin",
  "friends",
  "privacy",
  "terms",
  "forgot",
  "reset",
  "verify",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(20, "Username must be 20 characters or fewer.")
  .regex(/^[a-z0-9_]+$/, "Use letters, numbers, and underscores only.")
  .refine((name) => !reservedNames.has(name), "That name is reserved.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("That email does not look right.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(200, "Password is too long.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required.")
  .max(40, "Display name must be 40 characters or fewer.");

export const bioSchema = z.string().max(280, "Bio must be 280 characters or fewer.");

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, "Accent color must be a hex value like #d6ff2f.");

const linkSchema = z.object({
  label: z.string().trim().min(1).max(32),
  url: z.string().trim().url().max(400),
});

export const linksSchema = z.array(linkSchema).max(8);

const optionalHex = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, "Use a hex color like #d6ff2f.")
  .optional();

export const layoutConfigSchema = z
  .object({
    order: z
      .array(z.enum(["header", "links", "stories", "posts", "stats"]))
      .max(8)
      .optional(),
    showStats: z.boolean().optional(),
    bannerStyle: z.enum(["full", "strip", "none"]).optional(),
    featuredPostId: z.string().max(40).nullable().optional(),
    bgType: z.enum(["color", "image", "video"]).optional(),
    bgColor: optionalHex,
    textColor: optionalHex,
    font: z.enum(["serif", "sans", "mono"]).optional(),
    effect: z.enum(["none", "grain", "scan"]).optional(),
    align: z.enum(["center", "left"]).optional(),
    musicUrl: z.string().max(400).nullable().optional(),
    musicTitle: z.string().max(80).nullable().optional(),
    videoUrl: z.string().max(400).nullable().optional(),
    badges: z.array(z.enum(["early", "founding", "builder"])).max(6).optional(),
    avatarEffect: z.enum(["none", "ring", "glow", "pulse"]).optional(),
  })
  .passthrough();

export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    throw errors.badRequest(first?.message ?? "Invalid input.");
  }
  return result.data;
}

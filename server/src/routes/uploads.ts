import { createHash, randomUUID } from "node:crypto";
import { createRouter } from "../lib/router.js";
import { errors } from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimit.js";

const allowed = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg",
  "audio/webm", "audio/mp4", "audio/x-m4a",
  "video/mp4", "video/webm",
]);

export const uploadsRouter = createRouter();

uploadsRouter.post("/sign", requireAuth, writeLimiter, (req, res) => {
  const mime = String(req.body?.mime ?? "");
  const size = Number(req.body?.size);
  if (!allowed.has(mime) || !Number.isSafeInteger(size) || size < 1 || size > 16 * 1024 * 1024) {
    throw errors.badRequest("Invalid media type or file size (max 16 MB).");
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary upload credentials are not configured");
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "stat";
  const publicId = randomUUID();
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");
  res.json({ cloudName, apiKey, timestamp, folder, publicId, signature });
});

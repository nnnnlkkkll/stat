import fs from "node:fs";
import path from "node:path";
import { createRouter } from "../lib/router.js";
import multer from "multer";
import { config } from "../config.js";
import { errors } from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimit.js";

const images = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const audio = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4", "audio/x-m4a"]);
const video = new Set(["video/mp4", "video/webm"]);
const allowed = new Set([...images, ...audio, ...video]);

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = path.join(config.uploadDir, "media");
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 8) || ".bin";
    cb(null, `${req.user!.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      cb(errors.badRequest("Use an image, mp3/wav, or mp4/webm."));
      return;
    }
    cb(null, true);
  },
});

export const uploadsRouter = createRouter();

uploadsRouter.post("/", requireAuth, writeLimiter, upload.single("file"), (req, res) => {
  if (!req.file) throw errors.badRequest("Choose a file.");
  const url = `/uploads/media/${req.file.filename}`;
  res.status(201).json({ url, mime: req.file.mimetype });
});

import fs from "node:fs";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { attachUser } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { conversationsRouter } from "./routes/conversations.js";
import { discoverRouter } from "./routes/discover.js";
import { notificationsRouter } from "./routes/notifications.js";
import { postsRouter } from "./routes/posts.js";
import { safetyRouter } from "./routes/safety.js";
import { storiesRouter } from "./routes/stories.js";
import { uploadsRouter } from "./routes/uploads.js";
import { friendsRouter } from "./routes/friends.js";
import { usersRouter } from "./routes/users.js";

fs.mkdirSync(config.uploadDir, { recursive: true });

const app = express();

app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(config.uploadDir));
app.use(attachUser);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "stat" });
});

app.use("/api/auth", authRouter);
app.use("/api/discover", discoverRouter);
app.use("/api/users", friendsRouter);
app.use("/api/users", usersRouter);
app.use("/api/posts", postsRouter);
app.use("/api/stories", storiesRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api", safetyRouter);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`stat api on http://localhost:${config.port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

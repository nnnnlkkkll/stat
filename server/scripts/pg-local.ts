import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseDir = path.join(root, "data", "pg");
const clusterReady = fs.existsSync(path.join(databaseDir, "PG_VERSION"));

if (clusterReady) {
  const pidFile = path.join(databaseDir, "postmaster.pid");
  if (fs.existsSync(pidFile)) {
    const pid = Number(fs.readFileSync(pidFile, "utf8").split(/\r?\n/)[0]);
    try {
      process.kill(pid, 0);
    } catch {
      fs.unlinkSync(pidFile);
    }
  }
}

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "ick",
  password: "ick_dev_password",
  port: 5432,
  persistent: true,
});

if (!clusterReady) {
  await pg.initialise();
}
await pg.start();

try {
  await pg.createDatabase("ick");
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  if (!/already exists/i.test(message)) {
    console.warn(message);
  }
}

console.log("local postgres is up at postgresql://ick:ick_dev_password@localhost:5432/ick");
console.log("leave this window open. ctrl+c stops it.");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

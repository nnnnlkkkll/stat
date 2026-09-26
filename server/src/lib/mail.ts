import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

const mailDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data");
const mailLog = path.join(mailDir, "mail.log");

export async function sendMail(input: { to: string; subject: string; text: string }) {
  const stamp = new Date().toISOString();
  const body = [
    `--- ${stamp} ---`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "",
    input.text,
    "",
  ].join("\n");

  fs.mkdirSync(mailDir, { recursive: true });
  fs.appendFileSync(mailLog, body, "utf8");
  if (!config.isProd) {
    console.log(`[mail] ${input.subject} -> ${input.to}\n${input.text}`);
  }
}

export function appUrl(pathname: string) {
  return `${config.clientOrigin}${pathname}`;
}

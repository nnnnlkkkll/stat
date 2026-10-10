import { config } from "../config.js";

export async function sendMail(input: { to: string; subject: string; text: string }) {
  if (!config.isProd) {
    console.log(`[mail] ${input.subject} -> ${input.to}\n${input.text}`);
    return;
  }
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.MAIL_FROM;
  if (!apiKey || !sender) {
    throw new Error("RESEND_API_KEY and MAIL_FROM must be set in production");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });
  if (!response.ok) {
    console.error("Unable to deliver email", response.status);
    throw new Error("Email delivery failed");
  }
}

export function appUrl(pathname: string) {
  return `${config.clientOrigin}${pathname}`;
}

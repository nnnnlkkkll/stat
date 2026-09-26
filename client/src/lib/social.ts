export function socialKey(url: string, label: string): string {
  const u = `${url} ${label}`.toLowerCase();
  if (u.includes("instagram") || u.includes("instagr.am")) return "ig";
  if (u.includes("tiktok")) return "tt";
  if (u.includes("youtube") || u.includes("youtu.be")) return "yt";
  if (u.includes("discord")) return "dc";
  if (u.includes("spotify")) return "sp";
  if (u.includes("twitch")) return "tw";
  if (u.includes("github")) return "gh";
  if (u.includes("twitter") || u.includes("x.com")) return "x";
  if (u.includes("telegram") || u.includes("t.me")) return "tg";
  if (u.includes("snapchat")) return "sc";
  if (u.includes("steam")) return "st";
  return "link";
}

export function isSocialLink(url: string, label: string): boolean {
  return socialKey(url, label) !== "link";
}

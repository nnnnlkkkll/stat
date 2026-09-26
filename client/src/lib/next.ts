export function safeNext(raw: string | null | undefined) {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (raw.startsWith("/login") || raw.startsWith("/join") || raw.startsWith("/forgot") || raw.startsWith("/reset")) {
    return "/";
  }
  return raw;
}

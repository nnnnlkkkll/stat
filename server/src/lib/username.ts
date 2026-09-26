const HANDLE = /^[a-z0-9_]{3,20}$/;

export function normalizeHandle(raw: unknown): string | null {
  const handle = String(raw ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
  if (!HANDLE.test(handle)) return null;
  return handle;
}

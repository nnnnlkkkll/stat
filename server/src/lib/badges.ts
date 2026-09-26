export type ProfileBadge = { id: "early" | "founding" | "builder"; label: string };

const ALLOWED = new Set(["early", "founding", "builder"]);

const LABELS: Record<ProfileBadge["id"], string> = {
  early: "Early",
  founding: "Founding",
  builder: "Builder",
};

export function profileBadges(user: { createdAt: Date; profile: { layoutConfig: unknown } | null }): ProfileBadge[] {
  const cfg = (user.profile?.layoutConfig ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(cfg.badges) ? cfg.badges.filter((id): id is string => typeof id === "string") : [];
  const selected = raw.filter((id): id is ProfileBadge["id"] => ALLOWED.has(id));
  const ids = selected.length > 0 ? selected : defaultBadgeIds(user.createdAt);
  return ids.map((id) => ({ id, label: LABELS[id] }));
}

function defaultBadgeIds(createdAt: Date): ProfileBadge["id"][] {
  if (createdAt.getTime() < Date.parse("2027-01-01T00:00:00.000Z")) return ["early"];
  return [];
}

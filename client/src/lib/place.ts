import type { PublicUser } from "../types";

export type PlaceLook = {
  bgType: "color" | "image" | "video";
  bgColor: string;
  textColor: string;
  accent: string;
  font: "serif" | "sans" | "mono";
  effect: "none" | "grain" | "scan";
  align: "center" | "left";
  musicUrl: string | null;
  musicTitle: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  showStats: boolean;
  featuredPostId: string | null;
  badges: Array<"early" | "founding" | "builder">;
  avatarEffect: "none" | "ring" | "glow" | "pulse";
};

const HEX = /^#([0-9a-fA-F]{6})$/;
const BADGES = new Set(["early", "founding", "builder"]);

function hex(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value) ? value : fallback;
}

export function lookOf(user: PublicUser): PlaceLook {
  const cfg = user.layoutConfig ?? {};
  const bgType =
    cfg.bgType === "video" || cfg.bgType === "image" || cfg.bgType === "color"
      ? cfg.bgType
      : user.bannerUrl
        ? "image"
        : "color";

  const rawBadges = Array.isArray(cfg.badges)
    ? cfg.badges
    : (user.badges?.map((b) => b.id) ?? ["early"]);
  const badges = rawBadges.filter((id): id is PlaceLook["badges"][number] => typeof id === "string" && BADGES.has(id));

  return {
    bgType,
    bgColor: hex(cfg.bgColor, "#0b0b0c"),
    textColor: hex(cfg.textColor, "#f5f5f5"),
    accent: hex(user.accentColor, "#ffffff"),
    font: cfg.font === "serif" || cfg.font === "mono" ? cfg.font : "sans",
    effect: cfg.effect === "grain" || cfg.effect === "scan" ? cfg.effect : "none",
    align: cfg.align === "center" ? "center" : "left",
    musicUrl: typeof cfg.musicUrl === "string" && cfg.musicUrl ? cfg.musicUrl : null,
    musicTitle: typeof cfg.musicTitle === "string" ? cfg.musicTitle : null,
    videoUrl: typeof cfg.videoUrl === "string" && cfg.videoUrl ? cfg.videoUrl : null,
    imageUrl: user.bannerUrl,
    showStats: cfg.showStats !== false,
    featuredPostId: typeof cfg.featuredPostId === "string" ? cfg.featuredPostId : null,
    badges,
    avatarEffect:
      cfg.avatarEffect === "ring" || cfg.avatarEffect === "glow" || cfg.avatarEffect === "pulse"
        ? cfg.avatarEffect
        : "none",
  };
}

export function lookToConfig(look: PlaceLook): Record<string, unknown> {
  return {
    bgType: look.bgType,
    bgColor: look.bgColor,
    textColor: look.textColor,
    font: look.font,
    effect: look.effect,
    align: look.align,
    musicUrl: look.musicUrl,
    musicTitle: look.musicTitle,
    videoUrl: look.videoUrl,
    showStats: look.showStats,
    featuredPostId: look.featuredPostId,
    badges: look.badges,
    avatarEffect: look.avatarEffect,
  };
}

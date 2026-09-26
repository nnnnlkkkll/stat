import type { PublicUser } from "../types";

export type PlaceSection = "posts" | "media" | "about";
export type PlaceComposition = "editorial" | "minimal" | "wide" | "zine";
export type PlaceDensity = "tight" | "regular" | "loose";
export type PlaceBanner = "full" | "strip" | "none";
export type PlaceAvatarShape = "circle" | "rounded" | "square";
export type PlaceAvatarSize = "md" | "lg" | "xl";
export type PlaceBorder = "none" | "hairline" | "solid";
export type PlaceRadius = "none" | "subtle" | "round";

export type PlaceLook = {
  bgType: "color" | "image" | "video";
  bgColor: string;
  textColor: string;
  accent: string;
  font: "serif" | "sans" | "mono";
  effect: "none" | "grain" | "scan";
  align: "center" | "left";
  composition: PlaceComposition;
  density: PlaceDensity;
  bannerStyle: PlaceBanner;
  avatarShape: PlaceAvatarShape;
  avatarSize: PlaceAvatarSize;
  border: PlaceBorder;
  radius: PlaceRadius;
  musicUrl: string | null;
  musicTitle: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  showStats: boolean;
  showViews: boolean;
  showLinks: boolean;
  featuredPostId: string | null;
  badges: Array<"early" | "founding" | "builder">;
  avatarEffect: "none" | "ring" | "glow" | "pulse";
  sections: PlaceSection[];
};

const HEX = /^#([0-9a-fA-F]{6})$/;
const BADGES = new Set(["early", "founding", "builder"]);
const SECTIONS: PlaceSection[] = ["posts", "media", "about"];

function hex(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value) ? value : fallback;
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function sectionsOf(cfg: Record<string, unknown>): PlaceSection[] {
  const raw = Array.isArray(cfg.sections) ? cfg.sections : SECTIONS;
  const seen = new Set<string>();
  const out: PlaceSection[] = [];
  for (const item of raw) {
    if (typeof item === "string" && SECTIONS.includes(item as PlaceSection) && !seen.has(item)) {
      seen.add(item);
      out.push(item as PlaceSection);
    }
  }
  return out.length ? out : [...SECTIONS];
}

function compositionOf(user: PublicUser, cfg: Record<string, unknown>): PlaceComposition {
  if (
    cfg.composition === "editorial" ||
    cfg.composition === "minimal" ||
    cfg.composition === "wide" ||
    cfg.composition === "zine"
  ) {
    return cfg.composition;
  }
  if (user.layout === "wide") return "wide";
  if (user.layout === "zine") return "zine";
  if (user.theme === "compact") return "minimal";
  return "editorial";
}

function densityOf(user: PublicUser, cfg: Record<string, unknown>): PlaceDensity {
  if (cfg.density === "tight" || cfg.density === "regular" || cfg.density === "loose") return cfg.density;
  if (user.theme === "compact") return "tight";
  if (user.theme === "stacked") return "loose";
  return "regular";
}

export const DEFAULT_LOOK: PlaceLook = {
  bgType: "color",
  bgColor: "#0b0b0c",
  textColor: "#f5f5f5",
  accent: "#ffffff",
  font: "sans",
  effect: "none",
  align: "left",
  composition: "editorial",
  density: "regular",
  bannerStyle: "none",
  avatarShape: "circle",
  avatarSize: "xl",
  border: "hairline",
  radius: "subtle",
  musicUrl: null,
  musicTitle: null,
  videoUrl: null,
  imageUrl: null,
  showStats: true,
  showViews: true,
  showLinks: true,
  featuredPostId: null,
  badges: ["early"],
  avatarEffect: "none",
  sections: ["posts", "media", "about"],
};

export function lookOf(user: PublicUser): PlaceLook {
  const cfg = user.layoutConfig ?? {};
  const composition = compositionOf(user, cfg);
  const bgType = pick(cfg.bgType, ["video", "image", "color"] as const, user.bannerUrl ? "image" : "color");
  const rawBadges = Array.isArray(cfg.badges) ? cfg.badges : (user.badges?.map((b) => b.id) ?? ["early"]);
  const badges = rawBadges.filter((id): id is PlaceLook["badges"][number] => typeof id === "string" && BADGES.has(id));
  const bannerStyle = pick(cfg.bannerStyle, ["full", "strip", "none"] as const, user.bannerUrl ? "strip" : "none");

  return {
    bgType,
    bgColor: hex(cfg.bgColor, "#0b0b0c"),
    textColor: hex(cfg.textColor, "#f5f5f5"),
    accent: hex(user.accentColor, "#ffffff"),
    font: pick(cfg.font, ["serif", "sans", "mono"] as const, "sans"),
    effect: pick(cfg.effect, ["none", "grain", "scan"] as const, "none"),
    align: pick(cfg.align, ["center", "left"] as const, composition === "editorial" ? "center" : "left"),
    composition,
    density: densityOf(user, cfg),
    bannerStyle,
    avatarShape: pick(cfg.avatarShape, ["circle", "rounded", "square"] as const, "circle"),
    avatarSize: pick(cfg.avatarSize, ["md", "lg", "xl"] as const, composition === "minimal" ? "lg" : "xl"),
    border: pick(cfg.border, ["none", "hairline", "solid"] as const, "hairline"),
    radius: pick(cfg.radius, ["none", "subtle", "round"] as const, "subtle"),
    musicUrl: typeof cfg.musicUrl === "string" && cfg.musicUrl ? cfg.musicUrl : null,
    musicTitle: typeof cfg.musicTitle === "string" ? cfg.musicTitle : null,
    videoUrl: typeof cfg.videoUrl === "string" && cfg.videoUrl ? cfg.videoUrl : null,
    imageUrl: user.bannerUrl,
    showStats: cfg.showStats !== false,
    showViews: cfg.showViews !== false,
    showLinks: cfg.showLinks !== false,
    featuredPostId: typeof cfg.featuredPostId === "string" ? cfg.featuredPostId : null,
    badges,
    avatarEffect: pick(cfg.avatarEffect, ["none", "ring", "glow", "pulse"] as const, "none"),
    sections: sectionsOf(cfg),
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
    composition: look.composition,
    density: look.density,
    bannerStyle: look.bannerStyle,
    avatarShape: look.avatarShape,
    avatarSize: look.avatarSize,
    border: look.border,
    radius: look.radius,
    musicUrl: look.musicUrl,
    musicTitle: look.musicTitle,
    videoUrl: look.videoUrl,
    showStats: look.showStats,
    showViews: look.showViews,
    showLinks: look.showLinks,
    featuredPostId: look.featuredPostId,
    badges: look.badges,
    avatarEffect: look.avatarEffect,
    sections: look.sections,
  };
}

export function compositionToLayout(composition: PlaceComposition): "classic" | "wide" | "zine" {
  if (composition === "wide") return "wide";
  if (composition === "zine") return "zine";
  return "classic";
}

export function compositionToTheme(look: PlaceLook): "default" | "compact" | "stacked" {
  if (look.composition === "minimal" || look.density === "tight") return "compact";
  if (look.composition === "zine" || look.density === "loose") return "stacked";
  return "default";
}

export function placeVars(look: PlaceLook): Record<string, string> {
  return {
    "--place-bg": look.bgColor,
    "--place-ink": look.textColor,
    "--place-mark": look.accent,
  };
}

export function placeClassName(look: PlaceLook, extra?: string): string {
  return [
    "place",
    `font-${look.font}`,
    `align-${look.align}`,
    `fx-${look.effect}`,
    `comp-${look.composition}`,
    `den-${look.density}`,
    `ban-${look.bannerStyle}`,
    `av-${look.avatarShape}`,
    `avsz-${look.avatarSize}`,
    `bd-${look.border}`,
    `rad-${look.radius}`,
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function parseLinks(text: string): { label: string; url: string }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|").map((s) => s.trim());
      return { label, url };
    })
    .filter((l): l is { label: string; url: string } => Boolean(l.label && l.url));
}

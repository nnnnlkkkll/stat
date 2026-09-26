import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { Place } from "../components/Place";
import { useAuth } from "../context/AuthContext";
import {
  compositionToLayout,
  compositionToTheme,
  DEFAULT_LOOK,
  lookOf,
  lookToConfig,
  parseLinks,
  type PlaceLook,
  type PlaceSection,
} from "../lib/place";
import { profilePath } from "../lib/username";
import type { Post, PublicUser, Viewer } from "../types";

type Cat = "you" | "appearance" | "layout" | "media" | "content";

const CATS: { id: Cat; label: string }[] = [
  { id: "you", label: "You" },
  { id: "appearance", label: "Appearance" },
  { id: "layout", label: "Layout" },
  { id: "media", label: "Media" },
  { id: "content", label: "Content" },
];

const noop = () => undefined;

const PREVIEW_VIEWER: Viewer = {
  isSelf: true,
  isFollowing: false,
  isFavorited: false,
  hasLiked: false,
  friendship: "none",
};

export function EditProfile() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [cat, setCat] = useState<Cat>("you");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [accent, setAccent] = useState(user?.accentColor ?? "#ffffff");
  const [look, setLook] = useState<PlaceLook>(user ? lookOf(user) : DEFAULT_LOOK);
  const [linksText, setLinksText] = useState((user?.links ?? []).map((l) => `${l.label} | ${l.url}`).join("\n"));
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [posts, setPosts] = useState<Post[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void api.userPosts(user.id).then((d) => setPosts(d.posts));
  }, [user?.id]);

  const draft = useMemo<PublicUser | null>(() => {
    if (!user) return null;
    const merged: PlaceLook = { ...look, accent, imageUrl: look.imageUrl };
    return {
      ...user,
      displayName,
      bio,
      avatarUrl: avatarUrl || null,
      bannerUrl: look.imageUrl,
      accentColor: accent,
      links: parseLinks(linksText),
      theme: compositionToTheme(merged),
      layout: compositionToLayout(merged.composition),
      layoutConfig: lookToConfig(merged),
    };
  }, [user, displayName, bio, avatarUrl, accent, look, linksText]);

  if (!user || !draft) return null;

  function patchLook(partial: Partial<PlaceLook>) {
    setLook((prev) => ({ ...prev, ...partial }));
  }

  function moveSection(id: PlaceSection, dir: -1 | 1) {
    setLook((prev) => {
      const i = prev.sections.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.sections.length) return prev;
      const next = [...prev.sections];
      const [item] = next.splice(i, 1);
      next.splice(j, 0, item);
      return { ...prev, sections: next };
    });
  }

  function toggleSection(id: PlaceSection, on: boolean) {
    setLook((prev) => {
      if (on) return { ...prev, sections: prev.sections.includes(id) ? prev.sections : [...prev.sections, id] };
      const next = prev.sections.filter((s) => s !== id);
      return { ...prev, sections: next.length ? next : prev.sections };
    });
  }

  async function upload(kind: "avatar" | "banner" | "video" | "music", file: File) {
    const { url } = await api.upload(file);
    if (kind === "avatar") {
      await api.updateProfile({ avatarUrl: url });
      setAvatarUrl(url);
    } else if (kind === "banner") {
      await api.updateProfile({ bannerUrl: url });
      patchLook({ imageUrl: url, bgType: look.bgType === "video" ? "image" : look.bgType });
    } else if (kind === "video") {
      patchLook({ videoUrl: url, bgType: "video" });
    } else {
      patchLook({ musicUrl: url, musicTitle: look.musicTitle || file.name.replace(/\.[^.]+$/, "") });
    }
    await refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const merged = { ...look, accent };
      await api.updateProfile({
        displayName,
        bio,
        accentColor: accent,
        theme: compositionToTheme(merged),
        layout: compositionToLayout(merged.composition),
        links: parseLinks(linksText),
        bannerUrl: look.imageUrl,
        avatarUrl: avatarUrl || null,
        layoutConfig: lookToConfig(merged),
      });
      await refresh();
      nav(profilePath(user!.username));
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-pad edit-space">
      <p className="edit-kicker">
        <Link to={profilePath(user.username)}>← @{user.username}</Link>
      </p>
      <h1>customize</h1>
      <p className="muted edit-lead">This is your page. Change how it feels — the preview is you, live.</p>

      <div className="edit-layout">
        <form className="edit-form" onSubmit={onSubmit}>
          <div className="edit-cats" role="tablist" aria-label="Customization">
            {CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={cat === c.id}
                className={cat === c.id ? "on" : ""}
                onClick={() => setCat(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {cat === "you" && (
            <div className="edit-panel">
              <label className="field">
                <span>display name</span>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </label>
              <label className="field">
                <span>bio</span>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} />
              </label>
              <label className="field">
                <span>profile picture</span>
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void upload("avatar", e.target.files[0])} />
              </label>
              <label className="field">
                <span>links (one per line: label | url)</span>
                <textarea value={linksText} onChange={(e) => setLinksText(e.target.value)} />
              </label>
            </div>
          )}

          {cat === "appearance" && (
            <div className="edit-panel">
              <label className="field">
                <span>background color</span>
                <div className="color-row">
                  <input type="color" value={look.bgColor} onChange={(e) => patchLook({ bgColor: e.target.value })} />
                  <code>{look.bgColor}</code>
                </div>
              </label>
              <label className="field">
                <span>text color</span>
                <div className="color-row">
                  <input type="color" value={look.textColor} onChange={(e) => patchLook({ textColor: e.target.value })} />
                  <code>{look.textColor}</code>
                </div>
              </label>
              <label className="field">
                <span>accent</span>
                <div className="color-row">
                  <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
                  <code>{accent}</code>
                </div>
              </label>
              <label className="field">
                <span>typeface</span>
                <select value={look.font} onChange={(e) => patchLook({ font: e.target.value as PlaceLook["font"] })}>
                  <option value="serif">serif</option>
                  <option value="sans">sans</option>
                  <option value="mono">mono</option>
                </select>
              </label>
              <label className="field">
                <span>atmosphere</span>
                <select value={look.effect} onChange={(e) => patchLook({ effect: e.target.value as PlaceLook["effect"] })}>
                  <option value="none">clean</option>
                  <option value="grain">grain</option>
                  <option value="scan">scanlines</option>
                </select>
              </label>
              <label className="field">
                <span>density</span>
                <select value={look.density} onChange={(e) => patchLook({ density: e.target.value as PlaceLook["density"] })}>
                  <option value="tight">tight</option>
                  <option value="regular">regular</option>
                  <option value="loose">loose</option>
                </select>
              </label>
              <label className="field">
                <span>borders</span>
                <select value={look.border} onChange={(e) => patchLook({ border: e.target.value as PlaceLook["border"] })}>
                  <option value="none">none</option>
                  <option value="hairline">hairline</option>
                  <option value="solid">solid</option>
                </select>
              </label>
              <label className="field">
                <span>corners</span>
                <select value={look.radius} onChange={(e) => patchLook({ radius: e.target.value as PlaceLook["radius"] })}>
                  <option value="none">sharp</option>
                  <option value="subtle">subtle</option>
                  <option value="round">round</option>
                </select>
              </label>
            </div>
          )}

          {cat === "layout" && (
            <div className="edit-panel">
              <label className="field">
                <span>composition</span>
                <select
                  value={look.composition}
                  onChange={(e) => patchLook({ composition: e.target.value as PlaceLook["composition"] })}
                >
                  <option value="editorial">editorial — tall type, lots of air</option>
                  <option value="minimal">minimal — quiet and compact</option>
                  <option value="wide">wide — identity beside content</option>
                  <option value="zine">zine — denser, more internet</option>
                </select>
              </label>
              <label className="field">
                <span>alignment</span>
                <select value={look.align} onChange={(e) => patchLook({ align: e.target.value as PlaceLook["align"] })}>
                  <option value="left">from the left</option>
                  <option value="center">centered</option>
                </select>
              </label>
              <fieldset className="field">
                <span>sections</span>
                {(["posts", "media", "about"] as const).map((id) => (
                  <div key={id} className="edit-section-row">
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={look.sections.includes(id)}
                        onChange={(e) => toggleSection(id, e.target.checked)}
                      />{" "}
                      {id}
                    </label>
                    {look.sections.includes(id) && (
                      <span className="edit-order">
                        <button type="button" onClick={() => moveSection(id, -1)} aria-label={`Move ${id} up`}>
                          ↑
                        </button>
                        <button type="button" onClick={() => moveSection(id, 1)} aria-label={`Move ${id} down`}>
                          ↓
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </fieldset>
            </div>
          )}

          {cat === "media" && (
            <div className="edit-panel">
              <label className="field">
                <span>banner / background image</span>
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void upload("banner", e.target.files[0])} />
              </label>
              <label className="field">
                <span>banner style</span>
                <select
                  value={look.bannerStyle}
                  onChange={(e) => patchLook({ bannerStyle: e.target.value as PlaceLook["bannerStyle"] })}
                >
                  <option value="none">none</option>
                  <option value="strip">strip</option>
                  <option value="full">atmosphere</option>
                </select>
              </label>
              <label className="field">
                <span>background video</span>
                <input type="file" accept="video/mp4,video/webm" onChange={(e) => e.target.files?.[0] && void upload("video", e.target.files[0])} />
              </label>
              <label className="field">
                <span>background type</span>
                <select value={look.bgType} onChange={(e) => patchLook({ bgType: e.target.value as PlaceLook["bgType"] })}>
                  <option value="color">flat color</option>
                  <option value="image">image</option>
                  <option value="video">video</option>
                </select>
              </label>
              <label className="field">
                <span>avatar shape</span>
                <select
                  value={look.avatarShape}
                  onChange={(e) => patchLook({ avatarShape: e.target.value as PlaceLook["avatarShape"] })}
                >
                  <option value="circle">circle</option>
                  <option value="rounded">rounded</option>
                  <option value="square">square</option>
                </select>
              </label>
              <label className="field">
                <span>avatar size</span>
                <select
                  value={look.avatarSize}
                  onChange={(e) => patchLook({ avatarSize: e.target.value as PlaceLook["avatarSize"] })}
                >
                  <option value="md">medium</option>
                  <option value="lg">large</option>
                  <option value="xl">extra large</option>
                </select>
              </label>
              <label className="field">
                <span>avatar effect</span>
                <select
                  value={look.avatarEffect}
                  onChange={(e) => patchLook({ avatarEffect: e.target.value as PlaceLook["avatarEffect"] })}
                >
                  <option value="none">none</option>
                  <option value="ring">ring</option>
                  <option value="glow">glow</option>
                  <option value="pulse">pulse</option>
                </select>
              </label>
              <label className="field">
                <span>music</span>
                <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && void upload("music", e.target.files[0])} />
              </label>
              <label className="field">
                <span>track title</span>
                <input value={look.musicTitle ?? ""} onChange={(e) => patchLook({ musicTitle: e.target.value })} />
              </label>
              {posts.length > 0 && (
                <label className="field">
                  <span>up front (featured post)</span>
                  <select
                    value={look.featuredPostId ?? ""}
                    onChange={(e) => patchLook({ featuredPostId: e.target.value || null })}
                  >
                    <option value="">nothing featured</option>
                    {posts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.caption || p.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {cat === "content" && (
            <div className="edit-panel">
              <label className="field">
                <span>
                  <input
                    type="checkbox"
                    checked={look.showStats}
                    onChange={(e) => patchLook({ showStats: e.target.checked })}
                  />{" "}
                  show follower counts
                </span>
              </label>
              <label className="field">
                <span>
                  <input
                    type="checkbox"
                    checked={look.showViews}
                    onChange={(e) => patchLook({ showViews: e.target.checked })}
                  />{" "}
                  show profile views in About
                </span>
              </label>
              <label className="field">
                <span>
                  <input
                    type="checkbox"
                    checked={look.showLinks}
                    onChange={(e) => patchLook({ showLinks: e.target.checked })}
                  />{" "}
                  show links
                </span>
              </label>
              <fieldset className="field">
                <span>badges</span>
                {(["early", "founding", "builder"] as const).map((id) => (
                  <label key={id} className="check-row">
                    <input
                      type="checkbox"
                      checked={look.badges.includes(id)}
                      onChange={(e) =>
                        patchLook({
                          badges: e.target.checked ? [...look.badges, id] : look.badges.filter((b) => b !== id),
                        })
                      }
                    />{" "}
                    {id}
                  </label>
                ))}
              </fieldset>
            </div>
          )}

          {err && <div className="err">{err}</div>}
          <button className="btn mark" disabled={busy} type="submit">
            save and open the page
          </button>
        </form>

        <aside className="edit-live" aria-label="Live profile preview">
          <p className="edit-live-kicker">live preview</p>
          <div className="edit-live-frame">
            <Place
              user={draft}
              viewer={PREVIEW_VIEWER}
              hasStory={false}
              posts={posts}
              priv={false}
              preview
              actionErr=""
              onStory={noop}
              onFollow={noop}
              onLike={noop}
              onSave={noop}
              onMessage={noop}
              onReport={noop}
              onFriend={noop}
              onFriendAccept={noop}
              onFriendDecline={noop}
              onFriendRemove={noop}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

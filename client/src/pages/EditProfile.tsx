import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { lookOf, lookToConfig, type PlaceLook } from "../lib/place";
import { profilePath } from "../lib/username";
import type { Post } from "../types";

export function EditProfile() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [accent, setAccent] = useState(user?.accentColor ?? "#d6ff2f");
  const [look, setLook] = useState<PlaceLook>(
    user
      ? lookOf(user)
      : {
          bgType: "color",
          bgColor: "#0b0b0c",
          textColor: "#f5f5f5",
          accent: "#ffffff",
          font: "sans",
          effect: "none",
          align: "left",
          musicUrl: null,
          musicTitle: null,
          videoUrl: null,
          imageUrl: null,
          showStats: true,
          featuredPostId: null,
          badges: ["early"],
          avatarEffect: "none",
        },
  );
  const [linksText, setLinksText] = useState(
    (user?.links ?? []).map((l) => `${l.label} | ${l.url}`).join("\n"),
  );
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [posts, setPosts] = useState<Post[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void api.userPosts(user.id).then((d) => setPosts(d.posts));
  }, [user?.id]);

  if (!user) return null;

  function patchLook(partial: Partial<PlaceLook>) {
    setLook((prev) => ({ ...prev, ...partial }));
  }

  async function upload(kind: "avatar" | "banner" | "video" | "music", file: File) {
    const { url } = await api.upload(file);
    if (kind === "avatar") {
      await api.updateProfile({ avatarUrl: url });
      setAvatarUrl(url);
    } else if (kind === "banner") {
      await api.updateProfile({ bannerUrl: url });
      patchLook({ imageUrl: url, bgType: "image" });
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
      const links = linksText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [label, url] = line.split("|").map((s) => s.trim());
          return { label, url };
        })
        .filter((l) => l.label && l.url);
      await api.updateProfile({
        displayName,
        bio,
        accentColor: accent,
        theme: look.font === "sans" ? "compact" : look.align === "left" ? "stacked" : "default",
        layout: look.align === "left" ? "wide" : "classic",
        links,
        layoutConfig: lookToConfig({ ...look, accent }),
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
      <p className="muted edit-lead">background, badges, music, colors — this page is yours.</p>

      <div
        className={`edit-preview font-${look.font} align-${look.align}`}
        style={{
          ["--place-bg" as string]: look.bgColor,
          ["--place-ink" as string]: look.textColor,
          ["--place-mark" as string]: accent,
          background: look.bgColor,
          color: look.textColor,
          backgroundImage: look.imageUrl && look.bgType !== "video" ? `url(${look.imageUrl})` : undefined,
        }}
      >
        {avatarUrl ? <img className="avatar lg" src={avatarUrl} alt="" /> : <div className="avatar lg">{displayName.slice(0, 1) || user.username.slice(0, 1)}</div>}
        <div>
          <strong>{displayName || user.username}</strong>
          <div className="uname">@{user.username}</div>
        </div>
      </div>

      <form onSubmit={onSubmit}>
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
          <span>background image</span>
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void upload("banner", e.target.files[0])} />
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
          <span>layout</span>
          <select value={look.align} onChange={(e) => patchLook({ align: e.target.value as PlaceLook["align"] })}>
            <option value="left">from the left</option>
            <option value="center">centered</option>
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
          <span>avatar effect</span>
          <select value={look.avatarEffect} onChange={(e) => patchLook({ avatarEffect: e.target.value as PlaceLook["avatarEffect"] })}>
            <option value="none">none</option>
            <option value="ring">ring</option>
            <option value="glow">glow</option>
            <option value="pulse">pulse</option>
          </select>
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
        <label className="field">
          <span>
            <input
              type="checkbox"
              checked={look.showStats}
              onChange={(e) => patchLook({ showStats: e.target.checked })}
            />{" "}
            show counts
          </span>
        </label>
        <label className="field">
          <span>links (one per line: label | url)</span>
          <textarea value={linksText} onChange={(e) => setLinksText(e.target.value)} />
        </label>
        {err && <div className="err">{err}</div>}
        <button className="btn mark" disabled={busy} type="submit">
          save and open the page
        </button>
      </form>
    </div>
  );
}

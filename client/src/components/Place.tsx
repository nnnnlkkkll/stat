import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Post, PublicUser, Viewer } from "../types";
import { lookOf, placeClassName, placeVars } from "../lib/place";
import { isSocialLink, socialKey } from "../lib/social";
import { profilePath } from "../lib/username";
import { Avatar } from "./Avatar";
import { PlaceBadges } from "./PlaceBadges";
import { ProfileActions } from "./place/ProfileActions";
import { ProfileContent } from "./place/ProfileContent";

export function Place({
  user,
  viewer,
  hasStory,
  posts,
  priv,
  actionErr,
  preview = false,
  onStory,
  onFollow,
  onLike,
  onSave,
  onMessage,
  onReport,
  onFriend,
  onFriendAccept,
  onFriendDecline,
  onFriendRemove,
}: {
  user: PublicUser;
  viewer: Viewer;
  hasStory: boolean;
  posts: Post[];
  priv: boolean;
  actionErr: string;
  preview?: boolean;
  onStory: () => void;
  onFollow: () => void;
  onLike: () => void;
  onSave: () => void;
  onMessage: () => void;
  onReport: () => void;
  onFriend: () => void;
  onFriendAccept: () => void;
  onFriendDecline: () => void;
  onFriendRemove: () => void;
}) {
  const nav = useNavigate();
  const look = lookOf(user);
  const isSelf = Boolean(viewer.isSelf);
  const socials = user.links.filter((l) => isSocialLink(l.url, l.label));
  const extras = user.links.filter((l) => !isSocialLink(l.url, l.label));
  const needsEnter = Boolean(!preview && (look.musicUrl || look.videoUrl));
  const [entered, setEntered] = useState(!needsEnter);
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const badgeIds = user.badges?.map((b) => b.id) ?? look.badges;
  const showStrip = Boolean(look.imageUrl && look.bannerStyle === "strip" && look.bgType !== "video");
  const atmosphereImage = Boolean(
    look.imageUrl && look.bgType !== "video" && (look.bannerStyle === "full" || (look.bannerStyle === "none" && look.bgType === "image")),
  );

  async function copyShare() {
    const url = `${window.location.origin}${profilePath(user.username)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("copy this address", url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div
      className={placeClassName(look, [preview ? "is-preview" : "", atmosphereImage ? "has-atmosphere" : ""].filter(Boolean).join(" ") || undefined)}
      data-username={user.username}
      style={placeVars(look)}
    >
      <div className="place-bg" style={{ background: look.bgColor }}>
        {look.bgType === "video" && look.videoUrl && entered && (
          <video className="place-video" src={look.videoUrl} autoPlay muted loop playsInline />
        )}
        {atmosphereImage && <div className="place-photo" style={{ backgroundImage: `url(${look.imageUrl})` }} />}
      </div>
      <div className="place-wash" />
      <div className="place-fx" />

      {!entered && (
        <button className="place-enter" type="button" onClick={() => setEntered(true)}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" />
          ) : (
            <span className="place-enter-fallback">{user.displayName.slice(0, 1) || user.username.slice(0, 1)}</span>
          )}
          <small>tap to enter</small>
        </button>
      )}

      {entered && (
        <>
          {!preview && (
            <>
              <button
                className="place-back"
                type="button"
                aria-label="Back"
                onClick={() => {
                  if (window.history.length > 1) nav(-1);
                  else nav("/");
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="place-share" type="button" onClick={() => void copyShare()}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="9" y="9" width="10" height="10" rx="2" />
                  <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? "copied" : `stat/${user.username}`}
              </button>
            </>
          )}

          {showStrip && (
            <div
              className="place-banner strip"
              style={{ backgroundImage: `url(${look.imageUrl})` }}
              role="img"
              aria-label={`${user.displayName} banner`}
            />
          )}

          <div className="place-col">
            <div className="place-stage">
              <header className="place-ident">
                {hasStory && !preview ? (
                  <button
                    className={`place-face has-story av-${look.avatarEffect}`}
                    type="button"
                    onClick={onStory}
                    aria-label={`View ${user.displayName}'s story`}
                  >
                    <Avatar user={user} size="xl" story />
                  </button>
                ) : (
                  <div className={`place-face av-${look.avatarEffect}`}>
                    <Avatar user={user} size="xl" />
                  </div>
                )}

                <div className="place-meta">
                  <h1>{user.displayName || user.username}</h1>
                  <div className="place-id">
                    <span className="place-handle">@{user.username}</span>
                    <PlaceBadges ids={badgeIds} />
                  </div>
                  {user.bio && <p className="place-bio">{user.bio}</p>}

                  {look.showLinks && (socials.length > 0 || extras.length > 0) && (
                    <nav className="place-links" aria-label="Links">
                      {socials.map((l) => (
                        <a
                          className="place-link"
                          key={`${l.label}-${l.url}`}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {socialKey(l.url, l.label)}
                        </a>
                      ))}
                      {extras.map((l) => (
                        <a className="place-link" key={`${l.label}-${l.url}`} href={l.url} target="_blank" rel="noreferrer">
                          {l.label}
                        </a>
                      ))}
                    </nav>
                  )}

                  {look.showStats && (
                    <p className="place-stats">
                      {preview ? (
                        <>
                          <span>
                            <b>{user.followersCount}</b> followers
                          </span>
                          <span>
                            <b>{user.followingCount}</b> following
                          </span>
                        </>
                      ) : (
                        <>
                          <Link to={`${profilePath(user.username)}/followers`}>
                            <b>{user.followersCount}</b> followers
                          </Link>
                          <Link to={`${profilePath(user.username)}/following`}>
                            <b>{user.followingCount}</b> following
                          </Link>
                        </>
                      )}
                    </p>
                  )}

                  <ProfileActions
                    viewer={viewer}
                    preview={preview}
                    actionErr={actionErr}
                    onFollow={onFollow}
                    onLike={onLike}
                    onSave={onSave}
                    onMessage={onMessage}
                    onFriend={onFriend}
                    onFriendAccept={onFriendAccept}
                    onFriendDecline={onFriendDecline}
                    onFriendRemove={onFriendRemove}
                  />
                </div>
              </header>

              <ProfileContent user={user} look={look} posts={posts} priv={priv} isSelf={isSelf} preview={preview} />

              {!isSelf && !preview && (
                <button className="place-safety" type="button" onClick={onReport}>
                  report
                </button>
              )}
            </div>
          </div>

          {look.musicUrl && entered && !preview && (
            <div className="place-music">
              <button type="button" className={muted ? "off" : ""} onClick={() => setMuted((v) => !v)} aria-label={muted ? "Unmute" : "Mute"}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M9 8.5v7l7-3.5-7-3.5z" />
                </svg>
              </button>
              <audio src={look.musicUrl} autoPlay loop muted={muted} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

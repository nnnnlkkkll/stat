import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Post, PublicUser, Viewer } from "../types";
import { lookOf } from "../lib/place";
import { isSocialLink, socialKey } from "../lib/social";
import { profilePath } from "../lib/username";
import { Avatar } from "./Avatar";
import { PlaceBadges } from "./PlaceBadges";

export function Place({
  user,
  viewer,
  hasStory,
  posts,
  priv,
  actionErr,
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
  const featured = posts.find((p) => p.id === look.featuredPostId) ?? null;
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts;
  const socials = user.links.filter((l) => isSocialLink(l.url, l.label));
  const extras = user.links.filter((l) => !isSocialLink(l.url, l.label));
  const needsEnter = Boolean(look.musicUrl || look.videoUrl);
  const [entered, setEntered] = useState(!needsEnter);
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const views = user.viewsCount ?? 0;
  const badgeIds = user.badges?.map((b) => b.id) ?? look.badges;

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
      className={`place font-${look.font} align-${look.align} fx-${look.effect}`}
      data-username={user.username}
      style={{
        ["--place-bg" as string]: look.bgColor,
        ["--place-ink" as string]: look.textColor,
        ["--place-mark" as string]: look.accent,
      }}
    >
      <div className="place-bg" style={{ background: look.bgColor }}>
        {look.bgType === "video" && look.videoUrl && entered && (
          <video className="place-video" src={look.videoUrl} autoPlay muted loop playsInline />
        )}
        {look.bgType !== "video" && look.imageUrl && (
          <div className="place-photo" style={{ backgroundImage: `url(${look.imageUrl})` }} />
        )}
      </div>
      <div className="place-wash" />
      <div className="place-fx" />

      {!entered && (
        <button className="place-enter" type="button" onClick={() => setEntered(true)}>
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="place-enter-fallback">{user.displayName.slice(0, 1) || user.username.slice(0, 1)}</span>}
          <small>tap to enter</small>
        </button>
      )}

      {entered && (
        <>
          <button
            className="place-back"
            type="button"
            aria-label="back"
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

          <div className="place-col">
            <div className="place-head">
              {hasStory ? (
                <button className={`place-face has-story av-${look.avatarEffect}`} type="button" onClick={onStory} aria-label="view story">
                  <Avatar user={user} size="xl" story />
                </button>
              ) : (
                <div className={`place-face av-${look.avatarEffect}`}>
                  <Avatar user={user} size="xl" />
                </div>
              )}
            </div>

            <div className="place-meta">
              {user.displayName && user.displayName !== user.username && <h1>{user.displayName}</h1>}
              <div className="place-id">
                <span className="place-handle">@{user.username}</span>
                <PlaceBadges ids={badgeIds} />
              </div>
              {user.bio && <p className="place-bio">{user.bio}</p>}

              {look.showStats && (
                <div className="place-stats">
                  <Link to={`${profilePath(user.username)}/followers`}>
                    <b>{user.followersCount}</b> followers
                  </Link>
                  <Link to={`${profilePath(user.username)}/following`}>
                    <b>{user.followingCount}</b> following
                  </Link>
                </div>
              )}

              <div className="place-views">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {views} views
              </div>

              {socials.length > 0 && (
                <div className="place-socials">
                  {socials.map((l) => (
                    <a key={`${l.label}-${l.url}`} href={l.url} target="_blank" rel="noreferrer" title={l.label}>
                      {socialKey(l.url, l.label)}
                    </a>
                  ))}
                </div>
              )}

              {extras.length > 0 && (
                <div className="place-pills">
                  {extras.map((l) => (
                    <a key={`${l.label}-${l.url}`} href={l.url} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  ))}
                </div>
              )}

              <div className="place-acts">
                {isSelf ? (
                  <>
                    <Link to="/settings/profile">customize</Link>
                    <Link to="/new">post</Link>
                  </>
                ) : (
                  <>
                    {viewer.friendship === "friends" && (
                      <>
                        <button type="button" className="on" disabled>
                          Friends
                        </button>
                        <button type="button" onClick={onFriendRemove}>
                          Remove Friend
                        </button>
                        <button type="button" className="primary" onClick={onMessage}>
                          Message
                        </button>
                      </>
                    )}
                    {viewer.friendship === "outgoing" && (
                      <button type="button" className="on" onClick={onFriendRemove}>
                        Request Sent
                      </button>
                    )}
                    {viewer.friendship === "incoming" && (
                      <>
                        <button type="button" className="primary" onClick={onFriendAccept}>
                          Accept
                        </button>
                        <button type="button" onClick={onFriendDecline}>
                          Decline
                        </button>
                      </>
                    )}
                    {(viewer.friendship === "none" || !viewer.friendship) && (
                      <button type="button" className="primary" onClick={onFriend}>
                        Add Friend
                      </button>
                    )}
                    <button type="button" onClick={onFollow}>
                      {viewer.isFollowing ? "following" : "follow"}
                    </button>
                    <button type="button" className={viewer.hasLiked ? "on" : ""} onClick={onLike}>
                      {viewer.hasLiked ? "liked" : "like"}
                    </button>
                    <button type="button" className={viewer.isFavorited ? "on" : ""} onClick={onSave}>
                      {viewer.isFavorited ? "saved" : "save"}
                    </button>
                  </>
                )}
              </div>

              {actionErr && <div className="place-err">{actionErr}</div>}
            </div>

            <div className="place-work">
              {priv ? (
                <p className="place-empty">private. follow to request access.</p>
              ) : (
                <>
                  {featured && (
                    <Link className="place-featured" to={`/post/${featured.id}`}>
                      {featured.mediaUrl && <img src={featured.mediaUrl} alt="" />}
                      {featured.caption && <p>{featured.caption}</p>}
                    </Link>
                  )}
                  {rest.length > 0 && (
                    <div className="place-posts">
                      {rest.map((p) => (
                        <Link className="place-tile" key={p.id} to={`/post/${p.id}`}>
                          {p.mediaUrl && <img src={p.mediaUrl} alt="" />}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!isSelf && (
                <button className="place-safety" type="button" onClick={onReport}>
                  report
                </button>
              )}
            </div>
          </div>

          {look.musicUrl && (
            <div className="place-music">
              <button type="button" className={muted ? "off" : ""} onClick={() => setMuted((v) => !v)} aria-label={muted ? "unmute" : "mute"}>
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

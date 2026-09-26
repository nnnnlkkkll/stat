import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { ago } from "../../lib/time";
import { profilePath } from "../../lib/username";
import type { PlaceLook, PlaceSection } from "../../lib/place";
import type { Post, PublicUser } from "../../types";

const LABELS: Record<PlaceSection, string> = {
  posts: "Posts",
  media: "Media",
  about: "About",
};

export function ProfileContent({
  user,
  look,
  posts,
  priv,
  isSelf,
  preview,
}: {
  user: PublicUser;
  look: PlaceLook;
  posts: Post[];
  priv: boolean;
  isSelf: boolean;
  preview?: boolean;
}) {
  const tabs = look.sections;
  const [tab, setTab] = useState<PlaceSection>(tabs[0] ?? "posts");
  const [feed, setFeed] = useState(posts);

  useEffect(() => {
    setFeed(posts);
  }, [posts]);

  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0] ?? "posts");
  }, [tabs, tab]);

  const featured = feed.find((p) => p.id === look.featuredPostId) ?? null;
  const rest = featured ? feed.filter((p) => p.id !== featured.id) : feed;
  const ordered = featured ? [featured, ...rest] : rest;
  const media = useMemo(() => feed.filter((p) => p.mediaUrl), [feed]);

  if (priv && !isSelf) {
    return <p className="place-note">This place is private. Follow them to request access. Their posts stay hidden.</p>;
  }

  if (!tabs.length) return null;

  return (
    <div className="place-work">
      {tabs.length > 1 && (
        <div className="place-tabs" role="tablist" aria-label="Profile sections">
          {tabs.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`place-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`place-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const i = tabs.indexOf(tab);
                const next = e.key === "ArrowRight" ? tabs[(i + 1) % tabs.length] : tabs[(i - 1 + tabs.length) % tabs.length];
                setTab(next);
              }}
            >
              {LABELS[id]}
            </button>
          ))}
        </div>
      )}

      {tab === "posts" && tabs.includes("posts") && (
        <div className="place-panel" role="tabpanel" id="place-panel-posts" aria-labelledby="place-tab-posts">
          {ordered.length === 0 ? (
            <p className="place-empty">{isSelf ? "Nothing posted yet. This page is waiting for you." : "No posts yet."}</p>
          ) : (
            <div className="place-feed">
              {ordered.map((post) => (
                <ProfilePost
                  key={post.id}
                  post={post}
                  featured={featured?.id === post.id}
                  canOwn={isSelf}
                  preview={preview}
                  onChange={(next) => setFeed((prev) => prev.map((p) => (p.id === next.id ? next : p)))}
                  onGone={(id) => setFeed((prev) => prev.filter((p) => p.id !== id))}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "media" && tabs.includes("media") && (
        <div className="place-panel" role="tabpanel" id="place-panel-media" aria-labelledby="place-tab-media">
          {media.length === 0 ? (
            <p className="place-empty">No media yet.</p>
          ) : (
            <div className="place-media">
              {media.map((post) =>
                preview ? (
                  <span key={post.id}>
                    <img src={post.mediaUrl ?? ""} alt={post.caption || `${user.displayName} media`} />
                  </span>
                ) : (
                  <Link key={post.id} to={`/post/${post.id}`}>
                    <img src={post.mediaUrl ?? ""} alt={post.caption || `${user.displayName} media`} />
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      )}

      {tab === "about" && tabs.includes("about") && <ProfileAbout user={user} look={look} />}
    </div>
  );
}

function ProfilePost({
  post,
  featured,
  canOwn,
  preview,
  onChange,
  onGone,
}: {
  post: Post;
  featured: boolean;
  canOwn: boolean;
  preview?: boolean;
  onChange: (post: Post) => void;
  onGone: (id: string) => void;
}) {
  async function toggleLike() {
    if (preview) return;
    if (post.liked) await api.unlikePost(post.id);
    else await api.likePost(post.id);
    onChange({
      ...post,
      liked: !post.liked,
      likesCount: post.likesCount + (post.liked ? -1 : 1),
    });
  }

  const inner = (
    <>
      {featured && <div className="place-featured-kicker">up front</div>}
      {post.mediaUrl && (
        <span className="place-entry-media">
          <img src={post.mediaUrl} alt={post.caption || "Post"} />
        </span>
      )}
      {(post.caption || !post.mediaUrl) && (
        <div className="place-entry-copy">{post.caption ? <p>{post.caption}</p> : <p>untitled</p>}</div>
      )}
    </>
  );

  return (
    <article className="place-entry">
      {preview ? inner : <Link to={`/post/${post.id}`}>{inner}</Link>}
      <div className="place-entry-meta">
        <time dateTime={post.createdAt}>{ago(post.createdAt)}</time>
        <button type="button" className={post.liked ? "on" : ""} onClick={() => void toggleLike()} disabled={preview}>
          {post.likesCount} {post.likesCount === 1 ? "like" : "likes"}
        </button>
        {preview ? (
          <span>
            {post.commentsCount} {post.commentsCount === 1 ? "comment" : "comments"}
          </span>
        ) : (
          <Link to={`/post/${post.id}`}>
            {post.commentsCount} {post.commentsCount === 1 ? "comment" : "comments"}
          </Link>
        )}
        {canOwn && !preview && (
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Delete this post?")) return;
              void api.deletePost(post.id).then(() => onGone(post.id));
            }}
          >
            delete
          </button>
        )}
      </div>
    </article>
  );
}

function ProfileAbout({ user, look }: { user: PublicUser; look: PlaceLook }) {
  const joined = new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const views = user.viewsCount ?? 0;

  return (
    <div className="place-about" role="tabpanel" id="place-panel-about" aria-labelledby="place-tab-about">
      {user.bio && (
        <section>
          <h2>Bio</h2>
          <p>{user.bio}</p>
        </section>
      )}
      {look.showLinks && user.links.length > 0 && (
        <section>
          <h2>Links</h2>
          <ul className="place-about-list">
            {user.links.map((l) => (
              <li key={`${l.label}-${l.url}`}>
                <a href={l.url} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2>On STAT</h2>
        <ul className="place-about-list">
          <li>joined {joined}</li>
          {look.showStats && (
            <>
              <li>
                <Link to={`${profilePath(user.username)}/followers`}>{user.followersCount} followers</Link>
              </li>
              <li>
                <Link to={`${profilePath(user.username)}/following`}>{user.followingCount} following</Link>
              </li>
            </>
          )}
          {look.showViews && <li>{views} profile views</li>}
          {user.likesCount !== null && <li>{user.likesCount} profile likes</li>}
          {user.favoritesCount > 0 && <li>saved by {user.favoritesCount}</li>}
        </ul>
      </section>
    </div>
  );
}

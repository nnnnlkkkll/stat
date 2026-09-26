import { Link } from "react-router-dom";
import type { PublicUser, Viewer } from "../types";
import { profilePath } from "../lib/username";
import { Avatar } from "./Avatar";

export type DiscoverItem = {
  user: PublicUser;
  viewer: Viewer;
  hasActiveStory: boolean;
};

export function DiscoverCard({
  item,
  isLast,
  isEnd,
  moreBusy,
  moreErr,
  onRetryMore,
  onLike,
  onSave,
  onFollow,
  onMessage,
  onStory,
  actionErr,
}: {
  item: DiscoverItem;
  isLast: boolean;
  isEnd: boolean;
  moreBusy: boolean;
  moreErr: string;
  onRetryMore: () => void;
  onLike: () => void;
  onSave: () => void;
  onFollow: () => void;
  onMessage: () => void;
  onStory: () => void;
  actionErr: string;
}) {
  const { user, viewer } = item;
  const likes = user.likesCount;

  return (
    <section className="person">
      <div className="person-edge" style={{ background: user.accentColor }} />
      <div className="person-main">
        <div
          className="person-strip"
          style={{
            backgroundColor: user.accentColor,
            backgroundImage: user.bannerUrl ? `url(${user.bannerUrl})` : undefined,
          }}
        />
        <div className="person-body">
          <Link to={profilePath(user.username)} className="person-who">
            <Avatar user={user} size="xl" story={item.hasActiveStory} />
            <div className="person-names">
              <div className="handle">
                @{user.username}
                {item.hasActiveStory && <span className="live">story</span>}
              </div>
              <h2>{user.displayName}</h2>
            </div>
          </Link>
          {item.hasActiveStory && (
            <button className="btn text person-story" type="button" onClick={onStory}>
              watch story
            </button>
          )}
          <Link to={profilePath(user.username)} className="person-read">
            <p className="bio">{user.bio || "no bio. mysterious."}</p>
            <div className="stats">
              <span>{user.followersCount} followers</span>
              <span>{likes === null ? "likes hidden" : `${likes} likes`}</span>
              <span>{user.favoritesCount} saved</span>
            </div>
          </Link>
        </div>
        <div className="person-acts">
          <button className={`act ${viewer.hasLiked ? "on" : ""}`} type="button" onClick={onLike}>
            {viewer.hasLiked ? "liked" : "like"}
          </button>
          <button className={`act ${viewer.isFavorited ? "on" : ""}`} type="button" onClick={onSave}>
            {viewer.isFavorited ? "saved" : "save"}
          </button>
          <button className={`act ${viewer.isFollowing ? "follow-on" : ""}`} type="button" onClick={onFollow}>
            {viewer.isFollowing ? "following" : "follow"}
          </button>
          <button className="act act-msg" type="button" onClick={onMessage}>
            message
          </button>
        </div>
        {actionErr && <div className="person-note err">{actionErr}</div>}
        {isLast && moreBusy && <div className="person-note">fetching the next few…</div>}
        {isLast && moreErr && (
          <div className="person-note">
            {moreErr}{" "}
            <button className="btn text" type="button" onClick={onRetryMore}>
              try again
            </button>
          </div>
        )}
        {isLast && isEnd && !moreBusy && (
          <div className="person-note">that's everyone on the stack for now.</div>
        )}
        {!isLast && <div className="person-next">next person ↓</div>}
      </div>
    </section>
  );
}

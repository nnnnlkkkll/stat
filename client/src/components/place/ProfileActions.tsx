import { Link } from "react-router-dom";
import type { Viewer } from "../../types";

export function ProfileActions({
  viewer,
  preview,
  actionErr,
  onFollow,
  onLike,
  onSave,
  onMessage,
  onFriend,
  onFriendAccept,
  onFriendDecline,
  onFriendRemove,
}: {
  viewer: Viewer;
  preview?: boolean;
  actionErr: string;
  onFollow: () => void;
  onLike: () => void;
  onSave: () => void;
  onMessage: () => void;
  onFriend: () => void;
  onFriendAccept: () => void;
  onFriendDecline: () => void;
  onFriendRemove: () => void;
}) {
  const isSelf = Boolean(viewer.isSelf);

  return (
    <>
      <div className="place-acts">
        {isSelf ? (
          <>
            {preview ? (
              <button type="button" className="primary" disabled>
                Edit Profile
              </button>
            ) : (
              <Link className="primary" to="/settings/profile">
                Edit Profile
              </Link>
            )}
            {preview ? (
              <button type="button" disabled>
                Post
              </button>
            ) : (
              <Link to="/new">Post</Link>
            )}
          </>
        ) : (
          <>
            <button type="button" className={viewer.isFollowing ? "on" : "primary"} onClick={onFollow}>
              {viewer.isFollowing ? "Following" : "Follow"}
            </button>
            {viewer.friendship === "friends" && (
              <>
                <button type="button" className="on" disabled>
                  Friends
                </button>
                <button type="button" className="quiet" onClick={onFriendRemove}>
                  Remove
                </button>
                <button type="button" onClick={onMessage}>
                  Message
                </button>
              </>
            )}
            {viewer.friendship === "outgoing" && (
              <button type="button" className="on" onClick={onFriendRemove}>
                Requested
              </button>
            )}
            {viewer.friendship === "incoming" && (
              <>
                <button type="button" className="primary" onClick={onFriendAccept}>
                  Accept
                </button>
                <button type="button" className="quiet" onClick={onFriendDecline}>
                  Decline
                </button>
              </>
            )}
            {(viewer.friendship === "none" || !viewer.friendship) && (
              <button type="button" onClick={onFriend}>
                Add Friend
              </button>
            )}
            {viewer.friendship !== "friends" && (
              <button type="button" className="quiet" onClick={onMessage}>
                Message
              </button>
            )}
            <button type="button" className={`quiet${viewer.hasLiked ? " on" : ""}`} onClick={onLike}>
              {viewer.hasLiked ? "Liked" : "Like"}
            </button>
            <button type="button" className={`quiet${viewer.isFavorited ? " on" : ""}`} onClick={onSave}>
              {viewer.isFavorited ? "Saved" : "Save"}
            </button>
          </>
        )}
      </div>
      {actionErr && <div className="place-err">{actionErr}</div>}
    </>
  );
}

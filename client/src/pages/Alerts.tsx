import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ago } from "../lib/time";
import { profilePath } from "../lib/username";
import type { NotificationItem } from "../types";

const copy: Record<string, string> = {
  follow: "followed you",
  post_like: "liked a post",
  profile_like: "liked your profile",
  favorite: "saved you",
  comment: "commented",
  message: "sent a message",
  story_reply: "replied to your story",
  story_react: "reacted to your story",
  friend_request: "sent a friend request",
  friend_accept: "accepted your friend request",
  message_react: "reacted to your message",
};

function pingTo(n: NotificationItem) {
  if ((n.type === "message" || n.type === "message_react") && n.entityId) return `/inbox/${n.entityId}`;
  if ((n.type === "friend_request" || n.type === "friend_accept") && n.actor) return profilePath(n.actor.username);
  return n.actor ? profilePath(n.actor.username) : "/alerts";
}

export function Alerts() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);

  useEffect(() => {
    void (async () => {
      const data = await api.notifications();
      setItems(data.notifications);
      if (data.unread) await api.readNotifications();
    })();
  }, []);

  return (
    <div className="page page-pad">
      <h1 style={{ marginTop: 0 }}>pings</h1>
      {items === null ? (
        <div className="status-line">checking…</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <b>quiet. for now.</b>
          follows, likes, saves, comments, and messages land here.
        </div>
      ) : (
        items.map((n) => (
          <div className="row" key={n.id}>
            <div className="who">
              <strong>
                {n.actor ? <Link to={pingTo(n)}>@{n.actor.username}</Link> : "someone"} {copy[n.type] ?? n.type}
              </strong>
              <span>{ago(n.createdAt)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

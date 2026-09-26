import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { profilePath } from "../lib/username";
import type { PublicUser, Story } from "../types";

export function StoryViewer({
  userId,
  name,
  own = false,
  onClose,
}: {
  userId: string;
  name: string;
  own?: boolean;
  onClose: () => void;
}) {
  const [stories, setStories] = useState<Story[]>([]);
  const [i, setI] = useState(0);
  const [reply, setReply] = useState("");
  const [viewers, setViewers] = useState<{ viewedAt: string; user: PublicUser }[] | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    void api.stories(userId).then((d) => setStories(d.stories));
  }, [userId]);

  const current = stories[i];

  useEffect(() => {
    if (!current || own) return;
    void api.viewStory(current.id);
  }, [current?.id, own]);

  async function loadViewers() {
    if (!current) return;
    const data = await api.storyViewers(current.id);
    setViewers(data.viewers);
  }

  return (
    <div className="story-layer" onClick={onClose}>
      <div className="story-top" onClick={(e) => e.stopPropagation()}>
        <span>{name}</span>
        <button className="btn text" onClick={onClose} type="button">
          close
        </button>
      </div>
      {current ? (
        <>
          {current.mediaUrl.match(/\.(mp4|webm)(\?|$)/i) ? (
            <video
              src={current.mediaUrl}
              autoPlay
              playsInline
              onClick={(e) => {
                e.stopPropagation();
                if (i < stories.length - 1) setI(i + 1);
                else onClose();
              }}
            />
          ) : (
            <img
              src={current.mediaUrl}
              alt=""
              onClick={(e) => {
                e.stopPropagation();
                if (i < stories.length - 1) setI(i + 1);
                else onClose();
              }}
            />
          )}
          <div className="story-bar" onClick={(e) => e.stopPropagation()}>
            {own ? (
              <button className="btn text" type="button" onClick={() => void loadViewers()}>
                {current.viewsCount ?? 0} views
              </button>
            ) : (
              <>
                <button className="btn text" type="button" onClick={() => void api.reactStory(current.id).then(() => setNote("sent a heart"))}>
                  heart
                </button>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!reply.trim()) return;
                    await api.replyStory(current.id, reply.trim());
                    setReply("");
                    setNote("reply sent");
                  }}
                >
                  <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="reply" />
                </form>
              </>
            )}
            {note && <span>{note}</span>}
          </div>
          {viewers && (
            <div className="story-viewers" onClick={(e) => e.stopPropagation()}>
              {viewers.length === 0 && <div>no views yet.</div>}
              {viewers.map((v) => (
                <Link key={v.user.id} to={profilePath(v.user.username)}>
                  @{v.user.username}
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="empty" style={{ color: "#efe9d8", padding: 24 }}>
          nothing live.
        </div>
      )}
    </div>
  );
}

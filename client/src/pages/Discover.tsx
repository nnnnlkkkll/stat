import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { DiscoverCard, type DiscoverItem } from "../components/DiscoverCard";
import { StoryViewer } from "../components/StoryViewer";

export function Discover() {
  const nav = useNavigate();
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreErr, setMoreErr] = useState("");
  const [actionErr, setActionErr] = useState<Record<string, string>>({});
  const [story, setStory] = useState<DiscoverItem | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const loadingMore = useRef(false);

  async function load(next?: string) {
    if (loadingMore.current) return;
    if (next && done) return;
    loadingMore.current = true;
    if (next) {
      setMoreBusy(true);
      setMoreErr("");
    } else {
      setLoading(true);
      setErr("");
    }
    try {
      const data = await api.discover(next);
      setItems((prev) => (next ? [...prev, ...data.items] : data.items));
      setCursor(data.nextCursor);
      setDone(!data.nextCursor);
    } catch {
      if (next) setMoreErr("couldn't get the next people.");
      else setErr("couldn't load anyone.");
    } finally {
      setLoading(false);
      setMoreBusy(false);
      loadingMore.current = false;
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || !cursor) return;
    const cards = feed.querySelectorAll(".person");
    const target = cards[Math.max(0, cards.length - 2)] ?? cards[cards.length - 1];
    if (!target) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !moreErr) void load(cursor);
      },
      { root: feed, threshold: 0.45 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [cursor, items.length, done, moreErr]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || items.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let acc = 0;
    let locked = false;
    let unlock = 0;

    const onWheel = (e: WheelEvent) => {
      if (document.querySelector(".story-layer")) return;
      if (Math.abs(e.deltaY) < 2) return;
      e.preventDefault();
      acc += e.deltaY;
      if (locked || Math.abs(acc) < 36) return;
      const dir = acc > 0 ? 1 : -1;
      acc = 0;
      locked = true;
      feed.scrollBy({ top: dir * feed.clientHeight, behavior: "smooth" });
      window.clearTimeout(unlock);
      unlock = window.setTimeout(() => {
        locked = false;
      }, 480);
    };

    feed.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      feed.removeEventListener("wheel", onWheel);
      window.clearTimeout(unlock);
    };
  }, [items.length]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector(".story-layer")) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowDown" || e.key === "j" || e.key === " ") {
        e.preventDefault();
        feed.scrollBy({ top: feed.clientHeight, behavior: "smooth" });
      }
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        feed.scrollBy({ top: -feed.clientHeight, behavior: "smooth" });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  async function toggle(kind: "like" | "fav" | "follow", item: DiscoverItem) {
    const id = item.user.id;
    setActionErr((prev) => ({ ...prev, [id]: "" }));
    try {
      let viewer = { ...item.viewer };
      let likesCount = item.user.likesCount;
      let followersCount = item.user.followersCount;
      let favoritesCount = item.user.favoritesCount;

      if (kind === "like") {
        if (viewer.hasLiked) await api.unlikeProfile(id);
        else await api.likeProfile(id);
        viewer = { ...viewer, hasLiked: !viewer.hasLiked };
        if (likesCount !== null) likesCount = likesCount + (viewer.hasLiked ? 1 : -1);
      }
      if (kind === "fav") {
        if (viewer.isFavorited) await api.unfavorite(id);
        else await api.favorite(id);
        viewer = { ...viewer, isFavorited: !viewer.isFavorited };
        favoritesCount = favoritesCount + (viewer.isFavorited ? 1 : -1);
      }
      if (kind === "follow") {
        if (viewer.isFollowing) await api.unfollow(id);
        else await api.follow(id);
        viewer = { ...viewer, isFollowing: !viewer.isFollowing };
        followersCount = followersCount + (viewer.isFollowing ? 1 : -1);
      }

      setItems((prev) =>
        prev.map((x) =>
          x.user.id === id
            ? { ...x, viewer, user: { ...x.user, likesCount, followersCount, favoritesCount } }
            : x,
        ),
      );
    } catch (error) {
      setActionErr((prev) => ({
        ...prev,
        [id]: error instanceof ApiError ? error.message : "that didn't stick.",
      }));
    }
  }

  async function message(item: DiscoverItem) {
    setActionErr((prev) => ({ ...prev, [item.user.id]: "" }));
    try {
      const data = await api.startConversation(item.user.id);
      nav(`/inbox/${data.conversation.id}`);
    } catch (error) {
      setActionErr((prev) => ({
        ...prev,
        [item.user.id]: error instanceof ApiError ? error.message : "couldn't start a thread.",
      }));
    }
  }

  if (loading) {
    return (
      <div className="feed">
        <section className="person person-state">
          <div className="person-edge" style={{ background: "var(--mark)" }} />
          <div className="person-main">
            <div className="person-ghost-circle" />
            <div className="person-ghost-line wide" />
            <div className="person-ghost-line" />
            <p className="person-state-copy">looking for people…</p>
          </div>
        </section>
      </div>
    );
  }

  if (err) {
    return (
      <div className="feed">
        <section className="person person-state">
          <div className="person-edge" style={{ background: "var(--hot)" }} />
          <div className="person-main">
            <p className="person-state-copy">
              <b>the stack didn't load.</b>
              {err}
            </p>
            <button className="btn ghost" type="button" onClick={() => void load()}>
              try again
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="feed">
        <section className="person person-state">
          <div className="person-edge" style={{ background: "var(--mark)" }} />
          <div className="person-main">
            <p className="person-state-copy">
              <b>nobody here.</b>
              no public profiles yet.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <div className="feed" ref={feedRef} tabIndex={0}>
        {items.map((item, i) => (
          <DiscoverCard
            key={item.user.id}
            item={item}
            isLast={i === items.length - 1}
            isEnd={done}
            moreBusy={moreBusy}
            moreErr={moreErr}
            onRetryMore={() => void load(cursor ?? undefined)}
            onLike={() => void toggle("like", item)}
            onSave={() => void toggle("fav", item)}
            onFollow={() => void toggle("follow", item)}
            onMessage={() => void message(item)}
            onStory={() => setStory(item)}
            actionErr={actionErr[item.user.id] ?? ""}
          />
        ))}
      </div>
      {story && (
        <StoryViewer
          userId={story.user.id}
          name={`@${story.user.username}`}
          onClose={() => setStory(null)}
        />
      )}
    </div>
  );
}

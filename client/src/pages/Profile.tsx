import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { Place } from "../components/Place";
import { StoryViewer } from "../components/StoryViewer";
import { useAuth } from "../context/AuthContext";
import { normalizeHandle } from "../lib/username";
import type { FriendState, Post, PublicUser, Viewer } from "../types";

type Loaded = {
  handle: string;
  user: PublicUser;
  viewer: Viewer;
  posts: Post[];
  hasStory: boolean;
  priv: boolean;
};

export function Profile() {
  const { username: raw } = useParams();
  const handle = normalizeHandle(raw);
  return <PlacePage key={handle ?? "missing"} handle={handle} />;
}

function PlacePage({ handle }: { handle: string | null }) {
  const { user: me } = useAuth();
  const nav = useNavigate();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [err, setErr] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [storyOpen, setStoryOpen] = useState(false);
  const [reportOn, setReportOn] = useState(false);
  const [reason, setReason] = useState("spam");

  useEffect(() => {
    let live = true;
    setLoaded(null);
    setErr("");
    setActionErr("");
    setStoryOpen(false);
    setReportOn(false);

    if (!handle) {
      setErr("that is not a name.");
      return;
    }

    void (async () => {
      try {
        const data = await api.user(handle);
        if (!live) return;
        if (data.user.username !== handle) {
          setErr("profile did not match the address.");
          return;
        }
        const feed = await api.userPosts(data.user.id);
        if (!live) return;
        if (data.user.username !== handle) return;
        setLoaded({
          handle,
          user: data.user,
          viewer: {
            ...data.viewer,
            isSelf: Boolean(data.viewer.isSelf || me?.id === data.user.id),
          },
          posts: feed.posts,
          hasStory: data.hasActiveStory,
          priv: Boolean(feed.private),
        });
      } catch (error) {
        if (!live) return;
        setErr(error instanceof ApiError ? error.message : "couldn't open that place.");
      }
    })();

    return () => {
      live = false;
    };
  }, [handle, me?.id]);

  if (err) {
    return (
      <div className="page-pad">
        <div className="empty">
          <b>gone, or never here.</b>
          {err}
        </div>
      </div>
    );
  }

  if (!loaded || loaded.user.username !== handle) {
    return <div className="status-line">opening their place…</div>;
  }

  const { user, viewer } = loaded;
  const page = loaded;

  async function act(kind: "like" | "fav" | "follow") {
    setActionErr("");
    const next = { ...viewer };
    let likesCount = user.likesCount;
    let followersCount = user.followersCount;
    let favoritesCount = user.favoritesCount;
    try {
      if (kind === "like") {
        if (next.hasLiked) await api.unlikeProfile(user.id);
        else await api.likeProfile(user.id);
        next.hasLiked = !next.hasLiked;
        if (likesCount !== null) likesCount += next.hasLiked ? 1 : -1;
      }
      if (kind === "fav") {
        if (next.isFavorited) await api.unfavorite(user.id);
        else await api.favorite(user.id);
        next.isFavorited = !next.isFavorited;
        favoritesCount += next.isFavorited ? 1 : -1;
      }
      if (kind === "follow") {
        if (next.isFollowing) await api.unfollow(user.id);
        else await api.follow(user.id);
        next.isFollowing = !next.isFollowing;
        followersCount += next.isFollowing ? 1 : -1;
      }
      setLoaded({
        handle: page.handle,
        posts: page.posts,
        hasStory: page.hasStory,
        priv: page.priv,
        viewer: next,
        user: { ...user, likesCount, followersCount, favoritesCount },
      });
    } catch (error) {
      setActionErr(error instanceof ApiError ? error.message : "that didn't stick.");
    }
  }

  function setFriend(state: FriendState) {
    setLoaded({
      handle: page.handle,
      posts: page.posts,
      hasStory: page.hasStory,
      priv: page.priv,
      user,
      viewer: { ...viewer, friendship: state },
    });
  }

  async function friendAct(kind: "add" | "accept" | "decline" | "remove") {
    setActionErr("");
    try {
      if (kind === "add") {
        const data = await api.friendRequest(user.id);
        setFriend(data.state as FriendState);
        return;
      }
      if (kind === "accept") {
        const data = await api.friendAccept(user.id);
        setFriend(data.state as FriendState);
        return;
      }
      if (kind === "decline") {
        await api.friendDecline(user.id);
        setFriend("none");
        return;
      }
      await api.friendRemove(user.id);
      setFriend("none");
    } catch (error) {
      setActionErr(error instanceof ApiError ? error.message : "that didn't stick.");
    }
  }

  async function message() {
    setActionErr("");
    try {
      const data = await api.startConversation(user.id);
      nav(`/inbox/${data.conversation.id}`);
    } catch (error) {
      setActionErr(error instanceof ApiError ? error.message : "couldn't start a thread.");
    }
  }

  return (
    <>
      <Place
        user={user}
        viewer={viewer}
        hasStory={loaded.hasStory}
        posts={loaded.posts}
        priv={loaded.priv}
        actionErr={actionErr}
        onStory={() => setStoryOpen(true)}
        onFollow={() => void act("follow")}
        onLike={() => void act("like")}
        onSave={() => void act("fav")}
        onMessage={() => void message()}
        onReport={() => setReportOn((v) => !v)}
        onFriend={() => void friendAct("add")}
        onFriendAccept={() => void friendAct("accept")}
        onFriendDecline={() => void friendAct("decline")}
        onFriendRemove={() => void friendAct("remove")}
      />
      {reportOn && (
        <form
          className="place-report"
          onSubmit={async (e) => {
            e.preventDefault();
            await api.report({ targetId: user.id, reason, details: "" });
            setReportOn(false);
          }}
        >
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="spam">spam</option>
            <option value="harassment">harassment</option>
            <option value="impersonation">impersonation</option>
            <option value="hate">hate</option>
            <option value="other">other</option>
          </select>
          <button className="btn hot tiny" type="submit">
            send report
          </button>
          <button className="btn text" type="button" onClick={() => void api.block(user.id).then(() => nav("/"))}>
            block them
          </button>
        </form>
      )}
      {storyOpen && (
        <StoryViewer
          userId={user.id}
          name={`@${user.username}`}
          own={Boolean(viewer.isSelf)}
          onClose={() => setStoryOpen(false)}
        />
      )}
    </>
  );
}

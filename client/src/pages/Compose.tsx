import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function Compose() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<"post" | "story">("post");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setErr("add a file first.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const uploaded = await api.upload(file);
      if (kind === "story") {
        await api.createStory(uploaded.url);
        nav(user ? `/@${user.username}` : "/");
      } else {
        const data = await api.createPost({ caption, mediaUrl: uploaded.url });
        nav(`/post/${data.post.id}`);
      }
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-pad compose">
      <h1 style={{ marginTop: 0 }}>
        put something up
      </h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={`btn tiny ${kind === "post" ? "mark" : "ghost"}`} type="button" onClick={() => setKind("post")}>
          post
        </button>
        <button className={`btn tiny ${kind === "story" ? "mark" : "ghost"}`} type="button" onClick={() => setKind("story")}>
          story (24h)
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <label className="field">
          <span>{kind === "story" ? "image or video" : "image"}</span>
          <input
            type="file"
            accept={kind === "story" ? "image/*,video/mp4,video/webm" : "image/*"}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {kind === "post" && (
          <label className="field">
            <span>caption</span>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} />
          </label>
        )}
        {err && <div className="err">{err}</div>}
        <button className="btn mark" disabled={busy} type="submit">
          {busy ? "sending…" : kind === "story" ? "share story" : "publish"}
        </button>
      </form>
    </div>
  );
}

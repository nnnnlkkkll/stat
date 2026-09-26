import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { ago } from "../lib/time";
import { profilePath } from "../lib/username";
import type { Comment, Post } from "../types";

export function PostPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    void api.post(id).then((d) => setPost(d.post));
    void api.comments(id).then((d) => setComments(d.comments));
  }, [id]);

  if (!post) return <div className="status-line">opening post…</div>;

  return (
    <div className="post-page">
      <div className="post-media">{post.mediaUrl && <img src={post.mediaUrl} alt="" />}</div>
      <aside className="post-side">
        <div className="row" style={{ border: 0 }}>
          <Link to={profilePath(post.author.username)}>
            <Avatar user={post.author} />
          </Link>
          <div className="who">
            <Link to={profilePath(post.author.username)}>
              <strong>{post.author.displayName}</strong>
              <span>@{post.author.username}</span>
            </Link>
          </div>
        </div>
        <p>{post.caption}</p>
        <p className="muted" style={{ fontSize: 13 }}>
          {ago(post.createdAt)} · {post.likesCount} likes · {post.commentsCount} comments
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button
            className="btn tiny ghost"
            type="button"
            onClick={async () => {
              if (post.liked) await api.unlikePost(post.id);
              else await api.likePost(post.id);
              setPost({
                ...post,
                liked: !post.liked,
                likesCount: post.likesCount + (post.liked ? -1 : 1),
              });
            }}
          >
            {post.liked ? "unlike" : "like"}
          </button>
          {user?.id === post.author.id && (
            <button
              className="btn tiny hot"
              type="button"
              onClick={async () => {
                await api.deletePost(post.id);
                nav(`/@${user.username}`);
              }}
            >
              delete
            </button>
          )}
        </div>
        <div>
          {comments.map((c) => (
            <div className="comment" key={c.id}>
              <Link to={profilePath(c.author.username)}>@{c.author.username}</Link> {c.body}
              <div className="muted" style={{ fontSize: 11 }}>
                {ago(c.createdAt)}
              </div>
            </div>
          ))}
        </div>
        <form
          style={{ marginTop: 16 }}
          onSubmit={async (e) => {
            e.preventDefault();
            const data = await api.addComment(post.id, body);
            setComments((prev) => [...prev, data.comment]);
            setBody("");
          }}
        >
          <label className="field">
            <span>comment</span>
            <input value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <button className="btn tiny" type="submit">
            add
          </button>
        </form>
      </aside>
    </div>
  );
}

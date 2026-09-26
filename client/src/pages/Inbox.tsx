import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ago } from "../lib/time";
import { profilePath } from "../lib/username";
import type { ChatMessage, Conversation } from "../types";

const REACTIONS = ["❤️", "😂", "👍", "😭", "😡", "💀"];

function previewOf(c: Conversation) {
  const last = c.lastMessage;
  if (!last) return "no messages yet";
  if (last.type === "voice") return "voice note";
  return last.body || "message";
}

function fmtDur(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Inbox() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const logRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const [list, setList] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [recOn, setRecOn] = useState(false);
  const [voice, setVoice] = useState<{ file: File; url: string; duration: number } | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  async function refreshList() {
    const data = await api.conversations();
    setList(data.conversations);
  }

  useEffect(() => {
    void refreshList();
  }, []);

  useEffect(() => {
    if (!id) {
      setMessages([]);
      setReply(null);
      setTyping(null);
      return;
    }
    let live = true;
    async function pull() {
      try {
        const data = await api.messages(id!);
        if (!live) return;
        setMessages(data.messages);
        void api.markRead(id!).catch(() => undefined);
      } catch (e) {
        if (live) setErr(e instanceof Error ? e.message : "could not load");
      }
    }
    void pull();
    const tick = window.setInterval(() => void pull(), 3000);
    const typeTick = window.setInterval(async () => {
      try {
        const data = await api.typingNow(id!);
        if (!live) return;
        const first = data.typing[0];
        setTyping(first ? `${first.displayName} is typing...` : null);
      } catch {
        /* ignore */
      }
    }, 2000);
    return () => {
      live = false;
      window.clearInterval(tick);
      window.clearInterval(typeTick);
    };
  }, [id]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, id]);

  const active = list.find((c) => c.id === id);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      if (voice) {
        const up = await api.upload(voice.file);
        const data = await api.sendMessage(id, {
          type: "voice",
          mediaUrl: up.url,
          duration: voice.duration,
          replyToId: reply?.id ?? null,
        });
        setMessages((prev) => [...prev, data.message]);
        URL.revokeObjectURL(voice.url);
        setVoice(null);
      } else {
        if (!body.trim()) return;
        const data = await api.sendMessage(id, { body: body.trim(), replyToId: reply?.id ?? null });
        setMessages((prev) => [...prev, data.message]);
        setBody("");
      }
      setReply(null);
      await refreshList();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "could not send");
    }
  }

  function jumpTo(mid: string) {
    const node = document.getElementById(`msg-${mid}`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(mid);
    window.setTimeout(() => setFlash(null), 1200);
  }

  async function toggleReact(m: ChatMessage, emoji: string) {
    if (!id) return;
    const mine = m.reactions?.some((r) => r.emoji === emoji && r.mine);
    const data = mine ? await api.unreactMessage(id, m.id, emoji) : await api.reactMessage(id, m.id, emoji);
    setMessages((prev) => prev.map((row) => (row.id === m.id ? { ...row, reactions: data.reactions } : row)));
  }

  async function startRec() {
    if (recOn) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const duration = Math.max(1, Math.round((Date.now() - startedRef.current) / 1000));
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        setVoice({ file, url: URL.createObjectURL(blob), duration });
        setRecOn(false);
      };
      recRef.current = rec;
      startedRef.current = Date.now();
      rec.start();
      setRecOn(true);
    } catch {
      setErr("microphone is blocked or unavailable.");
    }
  }

  function stopRec() {
    recRef.current?.stop();
    recRef.current = null;
  }

  return (
    <div className={`inbox${id ? " open-thread" : ""}`}>
      <aside className="thread-list">
        <h2>inbox</h2>
        {list.length === 0 && (
          <div className="empty" style={{ padding: 14 }}>
            no threads yet. add a friend and write.
          </div>
        )}
        {list.map((c) => (
          <Link key={c.id} to={`/inbox/${c.id}`} className={`thread ${c.id === id ? "active" : ""}`}>
            <strong>{c.other?.displayName ?? "unknown"}</strong>
            <div className="preview">
              {c.unread ? "• " : ""}
              {previewOf(c)}
            </div>
            {c.lastMessage && <div className="preview">{ago(c.lastMessage.createdAt)}</div>}
          </Link>
        ))}
      </aside>
      <section className="chat">
        {!id ? (
          <div className="empty" style={{ padding: 24 }}>
            pick a thread. or message a friend from their place.
          </div>
        ) : (
          <>
            <div className="chat-head">
              <button className="btn text chat-back" type="button" onClick={() => nav("/inbox")}>
                ←
              </button>
              {active?.other ? (
                <Link to={profilePath(active.other.username)}>
                  <strong>{active.other.displayName}</strong>
                  <span>{active.other.online ? "Online" : `@${active.other.username}`}</span>
                </Link>
              ) : (
                "thread"
              )}
            </div>
            <div className="chat-log" ref={logRef}>
              {messages.map((m) => {
                const mine = m.senderId === user?.id;
                return (
                  <div
                    key={m.id}
                    id={`msg-${m.id}`}
                    className={`bubble ${mine ? "mine" : ""} ${flash === m.id ? "flash" : ""}`}
                  >
                    <div className="bubble-who">{mine ? "You" : m.sender.displayName}</div>
                    {m.replyTo && (
                      <button className="reply-chip" type="button" onClick={() => jumpTo(m.replyTo!.id)}>
                        {m.replyTo.displayName}: {m.replyTo.body || "voice note"}
                      </button>
                    )}
                    {m.deleted ? (
                      <em className="gone">deleted</em>
                    ) : m.type === "voice" && m.mediaUrl ? (
                      <VoicePlay
                        src={m.mediaUrl}
                        duration={m.duration ?? 0}
                        playing={playing === m.id}
                        onToggle={() => setPlaying((cur) => (cur === m.id ? null : m.id))}
                      />
                    ) : (
                      <div>{m.body}</div>
                    )}
                    <time>
                      {ago(m.createdAt)}
                      {m.editedAt ? " · edited" : ""}
                      {mine && !m.deleted ? (m.read ? "  ✓✓" : "  ✓") : ""}
                    </time>
                    {!!m.reactions?.length && (
                      <div className="react-row">
                        {m.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            type="button"
                            className={r.mine ? "on" : ""}
                            onClick={() => void toggleReact(m, r.emoji)}
                          >
                            {r.emoji} {r.count}
                          </button>
                        ))}
                      </div>
                    )}
                    {!m.deleted && (
                      <div className="bubble-tools">
                        <button type="button" onClick={() => setReply(m)}>
                          reply
                        </button>
                        {REACTIONS.map((emoji) => (
                          <button key={emoji} type="button" onClick={() => void toggleReact(m, emoji)}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {typing && <div className="typing-line">{typing}</div>}
            {err && <div className="err" style={{ padding: "0 12px" }}>{err}</div>}
            {reply && (
              <div className="reply-bar">
                <span>replying to {reply.sender.displayName}</span>
                <button className="btn text" type="button" onClick={() => setReply(null)}>
                  cancel
                </button>
              </div>
            )}
            {voice && (
              <div className="voice-preview">
                <VoicePlay
                  src={voice.url}
                  duration={voice.duration}
                  playing={playing === "draft"}
                  onToggle={() => setPlaying((cur) => (cur === "draft" ? null : "draft"))}
                />
                <button
                  className="btn text"
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(voice.url);
                    setVoice(null);
                  }}
                >
                  delete
                </button>
              </div>
            )}
            <form className="chat-form" onSubmit={send}>
              <input
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (id) void api.typing(id).catch(() => undefined);
                }}
                placeholder="Type a message..."
                disabled={Boolean(voice)}
              />
              <button
                className={`btn ghost mic ${recOn ? "on" : ""}`}
                type="button"
                aria-label="record voice"
                onPointerDown={() => void startRec()}
                onPointerUp={stopRec}
                onPointerLeave={stopRec}
              >
                🎙️
              </button>
              <button className="btn mark" type="submit">
                Send
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function VoicePlay({
  src,
  duration,
  playing,
  onToggle,
}: {
  src: string;
  duration: number;
  playing: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (playing) void el.play();
    else el.pause();
  }, [playing]);

  return (
    <div className="voice-bar">
      <button type="button" onClick={onToggle} aria-label={playing ? "pause" : "play"}>
        {playing ? "❚❚" : "▶"}
      </button>
      <span className="voice-track" />
      <span>{fmtDur(duration)}</span>
      <audio ref={ref} src={src} onEnded={onToggle} />
    </div>
  );
}

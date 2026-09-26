import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { UserRow } from "../components/UserRow";
import type { PublicUser } from "../types";

type Tab = "friends" | "incoming" | "sent";

export function Friends() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<PublicUser[] | null>(null);
  const [incoming, setIncoming] = useState<PublicUser[]>([]);
  const [sent, setSent] = useState<PublicUser[]>([]);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const [a, b, c] = await Promise.all([api.friends(), api.friendIncoming(), api.friendOutgoing()]);
      setFriends(a.users);
      setIncoming(b.users);
      setSent(c.users);
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "could not load friends.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function message(userId: string) {
    setErr("");
    try {
      const data = await api.startConversation(userId);
      nav(`/inbox/${data.conversation.id}`);
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "couldn't start a thread.");
    }
  }

  const rows = tab === "friends" ? friends ?? [] : tab === "incoming" ? incoming : sent;

  return (
    <div className="page page-pad">
      <h1 style={{ marginTop: 0 }}>friends</h1>
      <div className="friend-tabs">
        <button type="button" className={tab === "friends" ? "on" : ""} onClick={() => setTab("friends")}>
          friends {friends ? friends.length : ""}
        </button>
        <button type="button" className={tab === "incoming" ? "on" : ""} onClick={() => setTab("incoming")}>
          requests {incoming.length ? incoming.length : ""}
        </button>
        <button type="button" className={tab === "sent" ? "on" : ""} onClick={() => setTab("sent")}>
          sent {sent.length ? sent.length : ""}
        </button>
      </div>
      {err && <div className="err">{err}</div>}
      {friends === null ? (
        <div className="status-line">loading…</div>
      ) : rows.length === 0 ? (
        <div className="empty">
          <b>{tab === "friends" ? "no friends yet." : tab === "incoming" ? "no incoming requests." : "nothing waiting."}</b>
          open someone's place and add them.
        </div>
      ) : (
        rows.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            trailing={
              tab === "friends" ? (
                <button className="btn tiny" type="button" onClick={() => void message(user.id)}>
                  message
                </button>
              ) : tab === "incoming" ? (
                <div className="friend-acts">
                  <button
                    className="btn tiny mark"
                    type="button"
                    onClick={() => void api.friendAccept(user.id).then(load).catch((e) => setErr(e.message))}
                  >
                    accept
                  </button>
                  <button
                    className="btn tiny ghost"
                    type="button"
                    onClick={() => void api.friendDecline(user.id).then(load).catch((e) => setErr(e.message))}
                  >
                    decline
                  </button>
                </div>
              ) : (
                <button
                  className="btn tiny ghost"
                  type="button"
                  onClick={() => void api.friendRemove(user.id).then(load).catch((e) => setErr(e.message))}
                >
                  cancel
                </button>
              )
            }
          />
        ))
      )}
    </div>
  );
}

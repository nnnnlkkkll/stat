import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ago } from "../lib/time";
import type { AuthSession } from "../types";

export function Settings() {
  const { user, refresh, setUser } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [isPrivate, setPrivate] = useState(user?.isPrivate ?? false);
  const [showLikes, setShowLikes] = useState(user?.showLikes ?? true);
  const [allowMessages, setAllow] = useState(user?.allowMessages ?? "everyone");
  const [readReceipts, setReceipts] = useState(user?.readReceipts !== false);
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [devVerify, setDevVerify] = useState("");

  useEffect(() => {
    void api.sessions().then((d) => setSessions(d.sessions)).catch(() => undefined);
  }, []);

  if (!user) return null;

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const data = await api.updateAccount({ username, email, isPrivate, showLikes, allowMessages, readReceipts });
      setUser(data.user);
      setMsg("saved.");
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "could not save.");
    }
  }

  return (
    <div className="page page-pad">
      <div className="settings-grid">
        <nav className="settings-nav">
          <Link to="/settings">account</Link>
          <Link to="/settings/profile">profile look</Link>
          <Link to="/privacy">privacy</Link>
          <Link to="/terms">terms</Link>
          <Link to={`/@${user.username}`}>back to your place</Link>
        </nav>
        <div>
          <h1 style={{ marginTop: 0 }}>account</h1>
          <form onSubmit={saveAccount}>
            <label className="field">
              <span>username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label className="field">
              <span>email {user.emailVerified ? "· confirmed" : "· not confirmed"}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {!user.emailVerified && (
              <button
                className="btn tiny ghost"
                type="button"
                onClick={async () => {
                  try {
                    const data = await api.resendVerify();
                    setMsg("confirmation sent.");
                    setDevVerify(data.devVerifyUrl ?? "");
                  } catch (error) {
                    setErr(error instanceof ApiError ? error.message : "could not resend.");
                  }
                }}
              >
                resend confirmation
              </button>
            )}
            {devVerify && (
              <p className="note">
                local confirm: <a href={devVerify}>open link</a>
              </p>
            )}
            <label className="field">
              <span>
                <input type="checkbox" checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)} /> private
                profile
              </span>
              <div className="note">hides you from discover. posts stay with followers.</div>
            </label>
            <label className="field">
              <span>
                <input type="checkbox" checked={showLikes} onChange={(e) => setShowLikes(e.target.checked)} /> show like
                count
              </span>
            </label>
            <label className="field">
              <span>who can message you</span>
              <select value={allowMessages} onChange={(e) => setAllow(e.target.value)}>
                <option value="everyone">everyone</option>
                <option value="followers">followers only</option>
                <option value="none">nobody</option>
              </select>
            </label>
            <label className="field">
              <span>Read receipts</span>
              <div className="toggle-row">
                <button
                  className={`btn tiny ${readReceipts ? "mark" : "ghost"}`}
                  type="button"
                  onClick={() => setReceipts(true)}
                >
                  ON
                </button>
                <button
                  className={`btn tiny ${!readReceipts ? "mark" : "ghost"}`}
                  type="button"
                  onClick={() => setReceipts(false)}
                >
                  OFF
                </button>
              </div>
              <div className="note">when off, other people will not see that you read their messages.</div>
            </label>
            {err && <div className="err">{err}</div>}
            {msg && <div className="note">{msg}</div>}
            <button className="btn" type="submit">
              save account
            </button>
          </form>

          <form
            style={{ marginTop: 28 }}
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.changePassword({ currentPassword, newPassword });
                setCurrent("");
                setNew("");
                setMsg("password changed.");
              } catch (error) {
                setErr(error instanceof ApiError ? error.message : "password change failed.");
              }
            }}
          >
            <h2 style={{ fontSize: 16 }}>password</h2>
            <label className="field">
              <span>current</span>
              <input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
            </label>
            <label className="field">
              <span>new</span>
              <input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
            </label>
            <button className="btn ghost" type="submit">
              update password
            </button>
          </form>

          <div style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 16 }}>sessions</h2>
            {sessions.map((s) => (
              <div className="session-row" key={s.id}>
                <div>
                  <strong>{s.current ? "this device" : s.userAgent?.slice(0, 48) || "another device"}</strong>
                  <div className="note">
                    {s.ip ?? "unknown ip"} · {ago(s.createdAt)}
                  </div>
                </div>
                {!s.current && (
                  <button
                    className="btn tiny ghost"
                    type="button"
                    onClick={async () => {
                      await api.revokeSession(s.id);
                      setSessions((prev) => prev.filter((row) => row.id !== s.id));
                    }}
                  >
                    sign out
                  </button>
                )}
              </div>
            ))}
            <button
              className="btn ghost"
              type="button"
              onClick={async () => {
                await api.revokeOtherSessions();
                setSessions((prev) => prev.filter((s) => s.current));
                setMsg("signed out other devices.");
              }}
            >
              sign out other devices
            </button>
          </div>

          <div style={{ marginTop: 28 }}>
            <button
              className="btn ghost"
              type="button"
              onClick={async () => {
                await api.logout();
                setUser(null);
                nav("/login");
              }}
            >
              log out
            </button>
          </div>

          <div className="danger-box">
            <p>this deletes the account. posts, stories, messages from you, gone.</p>
            <button
              className="btn hot"
              type="button"
              onClick={async () => {
                if (!confirm("Delete this account permanently?")) return;
                await api.deleteAccount();
                await refresh();
                nav("/join");
              }}
            >
              delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

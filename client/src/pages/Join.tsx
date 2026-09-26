import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { AuthPassword, passwordHint } from "../components/AuthPassword";
import { useAuth } from "../context/AuthContext";
import { normalizeHandle } from "../lib/username";

export function Join() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const claimed = normalizeHandle(params.get("username")) ?? "";
  const [username, setUsername] = useState(claimed);
  const [displayName, setDisplayName] = useState(claimed);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [nameNote, setNameNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  useEffect(() => {
    const handle = normalizeHandle(username);
    if (!handle) {
      setAvailable(null);
      setNameNote(username.trim() ? "3–20 letters, numbers, _" : "");
      return;
    }
    const id = window.setTimeout(() => {
      void api.usernameAvailable(handle).then((d) => {
        setAvailable(d.available);
        setNameNote(d.available ? "that’s free." : d.reason ?? "taken.");
      });
    }, 280);
    return () => window.clearTimeout(id);
  }, [username]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErr("passwords do not match.");
      return;
    }
    if (!agree) {
      setErr("accept the terms to join.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api.register({ username, displayName: displayName || username, email, password });
      await refresh();
      nav(username ? `/@${normalizeHandle(username) ?? username}` : "/");
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="land">
      <header className="land-bar">
        <Link to="/" className="wordmark">
          stat.
        </Link>
        <Link to="/login">log in</Link>
      </header>
      <main className="land-main auth-main">
        <p className="land-kicker">first come</p>
        <h1>stat/{username || "you"}</h1>
        <p className="land-sub">create an account. then the page is yours.</p>
        <form className="land-form" onSubmit={onSubmit}>
          <label className="field">
            <span>username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            {nameNote && <div className={`note ${available === false ? "err" : ""}`}>{nameNote}</div>}
          </label>
          <label className="field">
            <span>display name</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="nickname" />
          </label>
          <label className="field">
            <span>email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <AuthPassword
            label="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            hint={passwordHint(password)}
          />
          <AuthPassword
            label="confirm password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          <label className="field check">
            <span>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree to the{" "}
              <Link to="/terms">terms</Link> and <Link to="/privacy">privacy policy</Link>
            </span>
          </label>
          {err && <div className="err">{err}</div>}
          <button className="btn mark" disabled={busy || !agree || available === false} type="submit">
            {busy ? "creating account…" : "create account"}
          </button>
        </form>
        <p className="land-note">
          already here? <Link to="/login">log in</Link>
        </p>
      </main>
    </div>
  );
}

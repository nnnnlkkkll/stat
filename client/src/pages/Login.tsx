import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { AuthPassword } from "../components/AuthPassword";
import { useAuth } from "../context/AuthContext";
import { safeNext } from "../lib/next";

export function Login() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={safeNext(params.get("next"))} replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api.login({ login, password, remember });
      await refresh();
      nav(safeNext(params.get("next")));
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Could not sign in.");
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
        <Link to="/join">claim a name</Link>
      </header>
      <main className="land-main auth-main">
        <p className="land-kicker">welcome back</p>
        <h1>log in</h1>
        <p className="land-sub">username or email, then your password.</p>
        <form className="land-form" onSubmit={onSubmit}>
          <label className="field">
            <span>username or email</span>
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>
          <AuthPassword
            label="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <label className="field check">
            <span>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              keep me signed in
            </span>
          </label>
          {err && <div className="err">{err}</div>}
          <button className="btn mark" disabled={busy || !login.trim() || !password} type="submit">
            {busy ? "signing in…" : "log in"}
          </button>
        </form>
        <p className="land-note">
          <Link to="/forgot">forgot password?</Link>
        </p>
        <p className="land-note">
          new here? <Link to="/join">claim a name</Link>
        </p>
      </main>
    </div>
  );
}

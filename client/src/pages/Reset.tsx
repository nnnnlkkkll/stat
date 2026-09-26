import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { AuthPassword, passwordHint } from "../components/AuthPassword";

export function Reset() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErr("passwords do not match.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api.resetPassword(token, password);
      nav("/login");
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Could not reset that password.");
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
        <p className="land-kicker">account</p>
        <h1>new password</h1>
        <p className="land-sub">pick something you can remember.</p>
        {!token ? (
          <div className="err">missing reset token.</div>
        ) : (
          <form className="land-form" onSubmit={onSubmit}>
            <AuthPassword
              label="new password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              hint={passwordHint(password)}
            />
            <AuthPassword
              label="confirm"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
            {err && <div className="err">{err}</div>}
            <button className="btn mark" disabled={busy || password.length < 8} type="submit">
              {busy ? "saving…" : "update password"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

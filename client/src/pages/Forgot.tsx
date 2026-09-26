import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";

export function Forgot() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState("");
  const [devLink, setDevLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const data = await api.forgotPassword(email);
      setSent(data.message);
      setDevLink(data.resetUrl ?? "");
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Could not start a reset.");
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
        <h1>forgot password</h1>
        <p className="land-sub">we’ll send a reset link if that email is on stat.</p>
        {sent ? (
          <>
            <p className="note">{sent}</p>
            {devLink && (
              <p className="note">
                local reset: <a href={devLink}>open link</a>
              </p>
            )}
            <p className="land-note">
              <Link to="/login">back to log in</Link>
            </p>
          </>
        ) : (
          <form className="land-form" onSubmit={onSubmit}>
            <label className="field">
              <span>email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
            </label>
            {err && <div className="err">{err}</div>}
            <button className="btn mark" disabled={busy || !email.trim()} type="submit">
              {busy ? "sending…" : "send reset link"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

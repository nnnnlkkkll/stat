import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function VerifyEmail() {
  const { refresh } = useAuth();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"work" | "ok" | "err">("work");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) {
      setState("err");
      setErr("missing confirm token.");
      return;
    }
    void api
      .verifyEmail(token)
      .then(async () => {
        await refresh();
        setState("ok");
      })
      .catch((error) => {
        setState("err");
        setErr(error instanceof ApiError ? error.message : "Could not confirm that email.");
      });
  }, [token, refresh]);

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
        <h1>confirm email</h1>
        {state === "work" && <p className="land-sub">checking that link…</p>}
        {state === "ok" && (
          <>
            <p className="land-sub">you’re confirmed.</p>
            <p className="land-note">
              <Link to="/">go in</Link>
            </p>
          </>
        )}
        {state === "err" && (
          <>
            <div className="err">{err}</div>
            <p className="land-note">
              <Link to="/settings">resend from settings</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}

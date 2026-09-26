import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { normalizeHandle } from "../lib/username";

const NAMES = ["ken", "nebula", "lemonz", "mocha"];

export function Landing() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [shown, setShown] = useState(NAMES[0]);
  const [on, setOn] = useState(true);
  const handle = normalizeHandle(name) ?? name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

  useEffect(() => {
    const id = window.setInterval(() => {
      setOn(false);
      window.setTimeout(() => {
        setShown((prev) => {
          const rest = NAMES.filter((n) => n !== prev);
          return rest[Math.floor(Math.random() * rest.length)] ?? prev;
        });
        setOn(true);
      }, 180);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  function claim(e: React.FormEvent) {
    e.preventDefault();
    const next = normalizeHandle(name);
    if (!next) return;
    nav(`/join?username=${encodeURIComponent(next)}`);
  }

  return (
    <div className="land">
      <header className="land-bar">
        <span className="wordmark">stat.</span>
        <Link to="/login">log in</Link>
      </header>

      <main className="land-main">
        <h1>
          stat/
          <span className={`land-flip${on ? "" : " off"}`}>{shown}</span>
        </h1>
        <form className="land-claim" onSubmit={claim}>
          <label className="land-url">
            <span>stat/</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={shown}
              autoComplete="username"
              autoFocus
              maxLength={20}
              spellCheck={false}
            />
          </label>
          <button className="btn mark" type="submit" disabled={!normalizeHandle(name)}>
            claim
          </button>
        </form>
        <p className="land-preview">{handle ? `that’s yours if it’s free` : "3–20 letters, numbers, _"}</p>
        <div className="land-tags">
          <span>music</span>
          <span>badges</span>
          <span>stories</span>
          <span>posts</span>
          <span>dms</span>
          <span>friends</span>
        </div>
        <p className="land-note">
          already have one? <Link to="/login">log in</Link>
        </p>
        <p className="land-legal">
          <Link to="/privacy">privacy</Link>
          <Link to="/terms">terms</Link>
        </p>
      </main>
    </div>
  );
}

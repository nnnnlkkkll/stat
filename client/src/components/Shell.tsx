import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { normalizeHandle, profilePath } from "../lib/username";
import { Avatar } from "./Avatar";

const RESERVED = new Set([
  "login",
  "join",
  "search",
  "saved",
  "inbox",
  "alerts",
  "new",
  "settings",
  "post",
  "stat",
  "friends",
  "privacy",
  "terms",
  "forgot",
  "reset",
  "verify",
]);

export function Shell() {
  const { user } = useAuth();
  const loc = useLocation();
  const [unreadMail, setUnreadMail] = useState(0);
  const [unreadPings, setUnreadPings] = useState(0);
  const [friendPings, setFriendPings] = useState(0);

  const first = loc.pathname.split("/")[1] ?? "";
  const handle = normalizeHandle(first);
  const onPlace = Boolean(handle && !RESERVED.has(handle) && !loc.pathname.includes("/followers") && !loc.pathname.includes("/following"));

  useEffect(() => {
    void api.conversations().then((d) => {
      setUnreadMail(d.conversations.filter((c) => c.unread).length);
    });
    void api.notifications().then((d) => setUnreadPings(d.unread));
    void api.friendIncoming().then((d) => setFriendPings(d.users.length));
  }, [loc.pathname]);

  return (
    <div className={onPlace ? "shell-place" : undefined}>
      {user && user.emailVerified === false && !onPlace && (
        <div className="verify-bar">
          confirm {user.email} to finish setting up.
          <button
            className="btn text"
            type="button"
            onClick={() => void api.resendVerify()}
          >
            resend
          </button>
        </div>
      )}
      <header className="topbar">
        <NavLink to="/" className="wordmark">
          stat<span>.</span>
        </NavLink>
        <nav className="nav-links">
          <NavLink to="/" end>
            discover
          </NavLink>
          <NavLink to="/search">find</NavLink>
          <NavLink to="/friends">
            friends
            {friendPings > 0 && <span className="dot" />}
          </NavLink>
          <NavLink to="/saved">saved</NavLink>
          <NavLink to="/inbox">
            inbox
            {unreadMail > 0 && <span className="dot" />}
          </NavLink>
          <NavLink to="/alerts">
            pings
            {unreadPings > 0 && <span className="dot" />}
          </NavLink>
          <NavLink to="/new">post</NavLink>
          <NavLink to="/settings">settings</NavLink>
        </nav>
        <div className="topbar-right">
          <button
            className="btn text"
            type="button"
            onClick={() => {
              const html = document.documentElement;
              const next = html.getAttribute("data-theme") === "light" ? "dark" : "light";
              html.setAttribute("data-theme", next);
              localStorage.setItem("stat-theme", next);
            }}
          >
            lights
          </button>
          {user && (
            <NavLink to={profilePath(user.username)} className="me-chip">
              <Avatar user={user} size="sm" />
              @{user.username}
            </NavLink>
          )}
        </div>
      </header>
      <Outlet />
      <nav className="bottom-nav">
        <NavLink to="/" end>
          home
        </NavLink>
        <NavLink to="/search">find</NavLink>
        <NavLink to="/friends">friends</NavLink>
        <NavLink to="/new">post</NavLink>
        <NavLink to="/inbox">mail</NavLink>
        {user && <NavLink to={profilePath(user.username)}>me</NavLink>}
      </nav>
    </div>
  );
}

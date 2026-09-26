import { useEffect, useState } from "react";
import { api } from "../api/client";
import { UserRow } from "../components/UserRow";
import type { PublicUser } from "../types";

export function Search() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!q.trim()) {
        setUsers([]);
        setCursor(null);
        return;
      }
      void api.search(q.trim()).then((d) => {
        setUsers(d.users);
        setCursor(d.nextCursor);
      });
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="page page-pad">
      <h1 style={{ marginTop: 0 }}>find someone</h1>
      <div className="search-bar">
        <label className="field">
          <span>username or display name</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="try june, hex, bean…"
          />
        </label>
      </div>
      {q && users.length === 0 && <div className="empty">no matches. names here are picky.</div>}
      {users.map((u) => (
        <UserRow key={u.id} user={u} />
      ))}
      {cursor && (
        <button
          className="btn ghost tiny"
          type="button"
          onClick={() =>
            void api.search(q.trim(), cursor).then((d) => {
              setUsers((prev) => [...prev, ...d.users]);
              setCursor(d.nextCursor);
            })
          }
        >
          more
        </button>
      )}
    </div>
  );
}

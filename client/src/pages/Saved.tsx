import { useEffect, useState } from "react";
import { api } from "../api/client";
import { UserRow } from "../components/UserRow";
import type { PublicUser } from "../types";

export function Saved() {
  const [users, setUsers] = useState<PublicUser[] | null>(null);

  useEffect(() => {
    void api.favorites().then((d) => setUsers(d.users));
  }, []);

  return (
    <div className="page page-pad">
      <h1 style={{ marginTop: 0 }}>saved people</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        only you can see this list.
      </p>
      {users === null ? (
        <div className="status-line">pulling your marks…</div>
      ) : users.length === 0 ? (
        <div className="empty">
          <b>you haven't marked anyone yet.</b>
          hit save on a profile if you want them later. it's not a follow.
        </div>
      ) : (
        users.map((u) => <UserRow key={u.id} user={u} />)
      )}
    </div>
  );
}

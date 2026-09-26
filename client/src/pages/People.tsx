import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { UserRow } from "../components/UserRow";
import { normalizeHandle } from "../lib/username";
import type { PublicUser } from "../types";

export function People({ kind }: { kind: "followers" | "following" }) {
  const { username = "" } = useParams();
  const handle = normalizeHandle(username);
  return <PeopleList key={`${handle}-${kind}`} handle={handle} kind={kind} />;
}

function PeopleList({ handle, kind }: { handle: string | null; kind: "followers" | "following" }) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [title, setTitle] = useState<string>(kind);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!handle) {
      setErr("that is not a name.");
      return;
    }
    void (async () => {
      try {
        const profile = await api.user(handle);
        if (profile.user.username !== handle) {
          setErr("profile did not match the address.");
          return;
        }
        const data = kind === "followers" ? await api.followers(profile.user.id) : await api.following(profile.user.id);
        setUsers(data.users);
        setTitle(`${kind} · @${profile.user.username}`);
      } catch {
        setErr("couldn't load that list.");
      }
    })();
  }, [handle, kind]);

  return (
    <div className="page page-pad">
      <h1>{title}</h1>
      {err ? (
        <div className="empty">{err}</div>
      ) : users.length === 0 ? (
        <div className="empty">nobody in this list. quiet is allowed.</div>
      ) : (
        users.map((u) => <UserRow key={u.id} user={u} />)
      )}
    </div>
  );
}

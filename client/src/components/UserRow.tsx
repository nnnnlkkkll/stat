import { Link } from "react-router-dom";
import type { PublicUser } from "../types";
import { profilePath } from "../lib/username";
import { Avatar } from "./Avatar";

export function UserRow({ user, trailing }: { user: PublicUser; trailing?: React.ReactNode }) {
  return (
    <div className="row">
      <Link to={profilePath(user.username)}>
        <Avatar user={user} />
      </Link>
      <div className="who">
        <Link to={profilePath(user.username)}>
          <strong>
            {user.displayName}
            {user.online ? <em className="online-dot" title="online" /> : null}
          </strong>
          <span>@{user.username}</span>
        </Link>
      </div>
      {trailing}
    </div>
  );
}

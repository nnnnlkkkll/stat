import type { PublicUser } from "../types";

export function Avatar({
  user,
  size = "md",
  story = false,
}: {
  user: Pick<PublicUser, "avatarUrl" | "displayName" | "username">;
  size?: "sm" | "md" | "lg" | "xl";
  story?: boolean;
}) {
  const cls = `avatar ${size === "xl" ? "xl" : size === "lg" ? "lg" : size === "sm" ? "sm" : ""} ${story ? "story" : ""}`.trim();
  if (user.avatarUrl) {
    return <img className={cls} src={user.avatarUrl} alt="" />;
  }
  return (
    <div className={cls} style={{ display: "grid", placeItems: "center" }}>
      {user.displayName.slice(0, 1)}
    </div>
  );
}

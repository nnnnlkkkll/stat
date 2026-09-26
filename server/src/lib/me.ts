import { publicUser } from "./users.js";

export function meUser(user: Parameters<typeof publicUser>[0] & {
  email: string;
  emailVerifiedAt?: Date | null;
  profile: { showLikes: boolean; readReceipts?: boolean } | null;
}) {
  return {
    ...publicUser(user),
    email: user.email,
    showLikes: user.profile?.showLikes ?? true,
    readReceipts: user.profile?.readReceipts ?? true,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

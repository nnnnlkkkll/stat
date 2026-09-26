import type {
  AuthSession,
  ChatMessage,
  Comment,
  Conversation,
  Me,
  NotificationItem,
  Post,
  PublicUser,
  Story,
  Viewer,
} from "../types";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error?.code ?? "ERROR", data.error?.message ?? "Request failed.");
  }
  return data as T;
}

export const api = {
  me: () => request<{ user: Me; session?: { id: string | null } }>("/api/auth/me"),
  usernameAvailable: (username: string) =>
    request<{ available: boolean; reason?: string }>(`/api/auth/username?username=${encodeURIComponent(username)}`),
  register: (body: { username: string; email: string; password: string; displayName: string }) =>
    request<{ user: Me; devVerifyUrl?: string }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { login: string; password: string; remember?: boolean }) =>
    request<{ user: Me }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean }>("/api/auth/password", { method: "PATCH", body: JSON.stringify(body) }),
  forgotPassword: (email: string) =>
    request<{ ok: boolean; message: string; resetUrl?: string }>("/api/auth/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ ok: boolean }>("/api/auth/reset", { method: "POST", body: JSON.stringify({ token, password }) }),
  verifyEmail: (token: string) =>
    request<{ ok: boolean }>("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }),
  resendVerify: () =>
    request<{ ok: boolean; already?: boolean; devVerifyUrl?: string }>("/api/auth/verify-email/resend", {
      method: "POST",
    }),
  sessions: () => request<{ sessions: AuthSession[] }>("/api/auth/sessions"),
  revokeSession: (id: string) => request<{ ok: boolean; signedOut?: boolean }>(`/api/auth/sessions/${id}`, { method: "DELETE" }),
  revokeOtherSessions: () =>
    request<{ ok: boolean; revoked: number }>("/api/auth/sessions/revoke-others", { method: "POST" }),

  user: (username: string) =>
    request<{ user: PublicUser; viewer: Viewer; hasActiveStory: boolean }>(`/api/users/${username}`),
  search: (q: string, cursor?: string) =>
    request<{ users: PublicUser[]; nextCursor: string | null }>(
      `/api/users/search?q=${encodeURIComponent(q)}${cursor ? `&cursor=${cursor}` : ""}`,
    ),
  updateProfile: (body: Record<string, unknown>) =>
    request<{ user: PublicUser }>("/api/users/me/profile", { method: "PATCH", body: JSON.stringify(body) }),
  updateAccount: (body: Record<string, unknown>) =>
    request<{ user: Me }>("/api/users/me/account", { method: "PATCH", body: JSON.stringify(body) }),
  deleteAccount: () => request<{ ok: boolean }>("/api/users/me", { method: "DELETE" }),

  follow: (id: string) => request(`/api/users/${id}/follow`, { method: "POST" }),
  unfollow: (id: string) => request(`/api/users/${id}/follow`, { method: "DELETE" }),
  favorite: (id: string) => request(`/api/users/${id}/favorite`, { method: "POST" }),
  unfavorite: (id: string) => request(`/api/users/${id}/favorite`, { method: "DELETE" }),
  likeProfile: (id: string) => request(`/api/users/${id}/like`, { method: "POST" }),
  unlikeProfile: (id: string) => request(`/api/users/${id}/like`, { method: "DELETE" }),
  followers: (id: string, cursor?: string) =>
    request<{ users: PublicUser[]; nextCursor: string | null }>(
      `/api/users/${id}/followers${cursor ? `?cursor=${cursor}` : ""}`,
    ),
  following: (id: string, cursor?: string) =>
    request<{ users: PublicUser[]; nextCursor: string | null }>(
      `/api/users/${id}/following${cursor ? `?cursor=${cursor}` : ""}`,
    ),
  favorites: (cursor?: string) =>
    request<{ users: PublicUser[]; nextCursor: string | null }>(
      `/api/users/me/favorites${cursor ? `?cursor=${cursor}` : ""}`,
    ),

  discover: (cursor?: string) =>
    request<{
      items: { user: PublicUser; viewer: Viewer; hasActiveStory: boolean }[];
      nextCursor: string | null;
    }>(`/api/discover?limit=3${cursor ? `&cursor=${cursor}` : ""}`),

  createPost: (body: { caption: string; mediaUrl: string }) =>
    request<{ post: Post }>("/api/posts", { method: "POST", body: JSON.stringify(body) }),
  post: (id: string) => request<{ post: Post }>(`/api/posts/${id}`),
  userPosts: (id: string, cursor?: string) =>
    request<{ posts: Post[]; nextCursor: string | null; private?: boolean }>(
      `/api/posts/user/${id}${cursor ? `?cursor=${cursor}` : ""}`,
    ),
  deletePost: (id: string) => request(`/api/posts/${id}`, { method: "DELETE" }),
  likePost: (id: string) => request(`/api/posts/${id}/like`, { method: "POST" }),
  unlikePost: (id: string) => request(`/api/posts/${id}/like`, { method: "DELETE" }),
  comments: (id: string, cursor?: string) =>
    request<{ comments: Comment[]; nextCursor: string | null }>(
      `/api/posts/${id}/comments${cursor ? `?cursor=${cursor}` : ""}`,
    ),
  addComment: (id: string, body: string) =>
    request<{ comment: Comment }>(`/api/posts/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),

  createStory: (mediaUrl: string) =>
    request<{ story: Story }>("/api/stories", { method: "POST", body: JSON.stringify({ mediaUrl }) }),
  stories: (userId: string) => request<{ stories: Story[] }>(`/api/stories/user/${userId}`),
  deleteStory: (id: string) => request(`/api/stories/${id}`, { method: "DELETE" }),
  viewStory: (id: string) => request(`/api/stories/${id}/view`, { method: "POST" }),
  storyViewers: (id: string) =>
    request<{ viewers: { viewedAt: string; user: PublicUser }[] }>(`/api/stories/${id}/viewers`),
  replyStory: (id: string, body: string) =>
    request(`/api/stories/${id}/reply`, { method: "POST", body: JSON.stringify({ body }) }),
  reactStory: (id: string) => request(`/api/stories/${id}/react`, { method: "POST" }),

  friends: () => request<{ users: PublicUser[] }>("/api/users/me/friends"),
  friendIncoming: () => request<{ users: PublicUser[] }>("/api/users/me/friend-requests"),
  friendOutgoing: () => request<{ users: PublicUser[] }>("/api/users/me/friend-requests/sent"),
  friendRequest: (id: string) => request<{ ok: boolean; state: string }>(`/api/users/${id}/friend`, { method: "POST" }),
  friendAccept: (id: string) => request<{ ok: boolean; state: string }>(`/api/users/${id}/friend/accept`, { method: "POST" }),
  friendDecline: (id: string) => request<{ ok: boolean; state: string }>(`/api/users/${id}/friend/decline`, { method: "POST" }),
  friendRemove: (id: string) => request<{ ok: boolean; state: string }>(`/api/users/${id}/friend`, { method: "DELETE" }),

  conversations: () => request<{ conversations: Conversation[] }>("/api/conversations"),
  startConversation: (userId: string) =>
    request<{ conversation: { id: string; other: PublicUser | null } }>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  messages: (id: string, cursor?: string) =>
    request<{ messages: ChatMessage[]; nextCursor: string | null }>(
      `/api/conversations/${id}/messages${cursor ? `?cursor=${cursor}` : ""}`,
    ),
  sendMessage: (id: string, body: Record<string, unknown>) =>
    request<{ message: ChatMessage }>(`/api/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  editMessage: (id: string, mid: string, body: string) =>
    request<{ message: ChatMessage }>(`/api/conversations/${id}/messages/${mid}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    }),
  deleteMessage: (id: string, mid: string) =>
    request(`/api/conversations/${id}/messages/${mid}`, { method: "DELETE" }),
  reactMessage: (id: string, mid: string, emoji: string) =>
    request<{ reactions: { emoji: string; count: number; mine: boolean }[] }>(
      `/api/conversations/${id}/messages/${mid}/reactions`,
      { method: "POST", body: JSON.stringify({ emoji }) },
    ),
  unreactMessage: (id: string, mid: string, emoji: string) =>
    request<{ reactions: { emoji: string; count: number; mine: boolean }[] }>(
      `/api/conversations/${id}/messages/${mid}/reactions`,
      { method: "DELETE", body: JSON.stringify({ emoji }) },
    ),
  markRead: (id: string) => request(`/api/conversations/${id}/read`, { method: "POST" }),
  typing: (id: string) => request(`/api/conversations/${id}/typing`, { method: "POST" }),
  typingNow: (id: string) =>
    request<{ typing: { id: string; username: string; displayName: string }[] }>(`/api/conversations/${id}/typing`),

  notifications: () =>
    request<{ unread: number; notifications: NotificationItem[]; nextCursor: string | null }>(
      "/api/notifications",
    ),
  readNotifications: () => request("/api/notifications/read", { method: "POST" }),

  block: (id: string) => request(`/api/users/${id}/block`, { method: "POST" }),
  unblock: (id: string) => request(`/api/users/${id}/block`, { method: "DELETE" }),
  report: (body: { targetId: string; reason: string; details: string }) =>
    request("/api/reports", { method: "POST", body: JSON.stringify(body) }),

  upload: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string }>("/api/uploads", { method: "POST", body: form });
  },
};

export type PublicUser = {
  id: string;
  username: string;
  createdAt: string;
  kind?: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  links: { label: string; url: string }[];
  theme: string;
  accentColor: string;
  layout: string;
  layoutConfig: Record<string, unknown>;
  likesCount: number | null;
  favoritesCount: number;
  followersCount: number;
  followingCount: number;
  viewsCount?: number;
  badges?: { id: string; label: string }[];
  isPrivate: boolean;
  allowMessages: string;
  lastSeenAt?: string | null;
  online?: boolean;
};

export type Me = PublicUser & {
  email: string;
  showLikes: boolean;
  readReceipts?: boolean;
  emailVerified?: boolean;
};

export type AuthSession = {
  id: string;
  current: boolean;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  ip: string | null;
};

export type FriendState = "none" | "outgoing" | "incoming" | "friends";

export type Viewer = {
  isSelf?: boolean;
  isFollowing: boolean;
  isFavorited: boolean;
  hasLiked: boolean;
  isBlocked?: boolean;
  friendship?: FriendState;
};

export type Post = {
  id: string;
  type: string;
  mediaUrl: string | null;
  caption: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  liked: boolean;
  author: PublicUser;
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: PublicUser;
};

export type Story = {
  id: string;
  mediaUrl: string;
  createdAt: string;
  expiresAt: string;
  viewsCount?: number;
  repliesCount?: number;
};

export type Conversation = {
  id: string;
  updatedAt: string;
  lastReadAt: string | null;
  unread: boolean;
  other: PublicUser | null;
  lastMessage: { id: string; body: string; type?: string; createdAt: string; senderId: string } | null;
};

export type ChatMessage = {
  id: string;
  body: string;
  type?: string;
  mediaUrl?: string | null;
  duration?: number | null;
  editedAt?: string | null;
  deleted?: boolean;
  createdAt: string;
  senderId: string;
  sender: PublicUser;
  replyTo?: { id: string; body: string; senderId: string; displayName: string } | null;
  reactions?: { emoji: string; count: number; mine: boolean }[];
  read?: boolean;
};

export type NotificationItem = {
  id: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  createdAt: string;
  actor: PublicUser | null;
};

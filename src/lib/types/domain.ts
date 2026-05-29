/**
 * Shared domain model for LibraryLoop (DL-12).
 *
 * These types are the single source of truth for both server (Route Handlers,
 * data-access layer) and client (React components). They mirror the schema
 * defined in .sdd/specs/home-feed/design.md. Persistence/auth implementations
 * land in later tasks (DL-14, DL-19); this task only fixes the contracts.
 */

/** Open set: the UI must never assume the only media type is "ebook" (Req 6.1). */
export type MediaType = string;

export const LIBRARY_STATUSES = ["wishlist", "current", "finished"] as const;
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

export const USER_KINDS = ["member", "community"] as const;
/** `member` can authenticate; `community` is a feed-only seed actor. */
export type UserKind = (typeof USER_KINDS)[number];

export const AUTH_PROVIDERS = ["password", "google"] as const;
/** `google` is reserved for the future SSO release; only `password` is used now. */
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const ACTIVITY_ACTIONS = ["added", "started", "finished", "reviewed"] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

/** Unified actor table: both members and community seed users (Req 10.1, 10.3). */
export interface User {
  id: string;
  kind: UserKind;
  name: string;
  /** Null for community-only actors; unique among members (Req 10.3). */
  email: string | null;
  avatarColor: string;
  bio: string;
}

/** Credentials are separated from User so Google SSO slots in later (Req 9.8). */
export interface AuthIdentity {
  id: string;
  userId: string;
  provider: AuthProvider;
  /** Null for password; the Google `sub` later. */
  providerAccountId: string | null;
  /** Set only for provider === "password". */
  passwordHash: string | null;
}

/** Server-validated, revocable session (Req 9.3, 9.5). */
export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  creator: string;
  genre: string;
  language: string;
  description: string;
  coverTheme: string;
}

export interface LibraryEntry {
  id: string;
  userId: string;
  mediaItemId: string;
  status: LibraryStatus;
  /** 1-5 when present; null otherwise (Req 10.4). */
  rating: number | null;
  review: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  mediaItemId: string;
  action: ActivityAction;
  detail: string;
  createdAt: string;
}

export interface Preferences {
  books: { favoriteAuthors: string[]; favoriteGenres: string[]; languages: string[] };
  music: { favoriteArtists: string[]; favoriteGenres: string[] };
  podcasts: { topics: string[] };
  streaming: { favoriteGenres: string[] };
}

export function isLibraryStatus(value: unknown): value is LibraryStatus {
  return typeof value === "string" && (LIBRARY_STATUSES as readonly string[]).includes(value);
}

export function isUserKind(value: unknown): value is UserKind {
  return typeof value === "string" && (USER_KINDS as readonly string[]).includes(value);
}

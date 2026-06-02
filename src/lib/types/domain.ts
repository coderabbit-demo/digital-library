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

/** Known media-type kinds with type-specific metadata (media-platform-v2 Req 1.1). */
export const MEDIA_KINDS = ["ebook", "music", "podcast", "tv_movie"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/**
 * Type-specific metadata stored on a media item (jsonb), discriminated on the
 * media kind. The open `MediaType` remains the canonical type; this captures
 * the per-kind extras and is validated into this union at the boundary so it is
 * never read as `any`. Unknown types carry no metadata (null).
 */
export type MediaItemMetadata =
  | { kind: "ebook"; pages?: number }
  | { kind: "music"; album?: string }
  | { kind: "podcast"; show?: string; episodeCount?: number }
  | { kind: "tv_movie"; runtimeMinutes?: number; seasons?: number };

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
  /** Real cover image URL (https) when known; null/absent ⇒ themed placeholder (cover-art Req 2.1, 2.3). */
  artworkUrl?: string | null;
  /** When cover resolution was last attempted; null/absent ⇒ never attempted, eligible (cover-art Req 4.5). */
  artworkCheckedAt?: string | null;
  /** Type-specific extras; null/absent for legacy rows and unknown types (Req 1.1, 1.4). */
  metadata?: MediaItemMetadata | null;
  /** Total consumable units (pages/episodes/runtime) backing progress (Req 3.1). */
  totalUnits?: number | null;
}

export interface LibraryEntry {
  id: string;
  userId: string;
  mediaItemId: string;
  status: LibraryStatus;
  /** 1-5 when present; null otherwise (Req 10.4). */
  rating: number | null;
  review: string;
  /** Consumption progress (e.g. pages read); null when not tracked (Req 3.1). */
  progress?: number | null;
  updatedAt: string;
}

/** A per-user periodic reading goal (media-platform-v2 Req 4). */
export interface Goal {
  id: string;
  userId: string;
  /** Period granularity, e.g. "year". */
  period: string;
  /** Period instance, e.g. "2026". */
  periodKey: string;
  targetCount: number;
  createdAt: string;
}

/** A persisted achievement unlock for a user (media-platform-v2 Req 6). */
export interface UserAchievement {
  id: string;
  userId: string;
  achievementKey: string;
  achievedAt: string;
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

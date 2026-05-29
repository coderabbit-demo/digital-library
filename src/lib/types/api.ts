/**
 * Shared API contract types (DL-12), reused by Route Handlers and the client
 * so request/response payloads are checked at compile time (Req 8.5).
 * Endpoint implementations land in DL-20 / DL-22..DL-26.
 */
import type { LibraryStatus, MediaType, Preferences, User } from "./domain";

/** Discriminated result envelope returned by client API helpers. */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export interface ApiError {
  status: number;
  message: string;
  /** Optional per-field validation messages. */
  fields?: Record<string, string>;
}

/** A feed row, pre-resolved server-side (actor + media joined). */
export interface FeedEntryDTO {
  id: string;
  actorName: string;
  avatarColor: string;
  detail: string;
  itemTitle: string;
  mediaType: MediaType;
  createdAt: string;
}

export interface MediaTypeOption {
  value: MediaType | "all";
  label: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ProfileUpdateRequest {
  name: string;
  email: string;
  bio: string;
  preferences: Preferences;
}

export interface LibraryUpsertRequest {
  mediaItemId: string;
  status: LibraryStatus;
}

export interface ReviewRequest {
  entryId: string;
  rating: number;
  review: string;
}

export interface CustomMediaRequest {
  title: string;
  creator: string;
  genre: string;
  language: string;
  description: string;
  status: LibraryStatus;
}

export interface AuthResponse {
  user: User;
}

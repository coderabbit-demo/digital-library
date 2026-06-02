/**
 * Pure request validators for the data API (DL-22..DL-26). Each returns a typed,
 * normalized value or null; handlers turn null into a 400.
 */
import {
  isLibraryStatus,
  type LibraryStatus,
  type MediaItemMetadata,
  type Preferences,
} from "@/lib/types";
import { normalizePreferences } from "@/lib/preferences";
import { parseMediaMetadata } from "@/lib/media-metadata";
import { normalizeTags } from "@/lib/tags";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

const MAX_TYPE_LENGTH = 64;

/**
 * Normalize a `?type=` filter at the boundary. Missing/empty/"all" means "no
 * filter"; otherwise the trimmed value is used. Media types are an open,
 * data-driven set (Req 5.2/6.2), so we do not allowlist values — an unknown
 * type simply yields an empty result. Absurdly long values are ignored.
 */
export function parseTypeFilter(raw: string | null | undefined): string | undefined {
  const value = (raw ?? "").trim();
  if (!value || value === "all" || value.length > MAX_TYPE_LENGTH) return undefined;
  return value;
}

export interface ProfileUpdate {
  name: string;
  email: string;
  bio: string;
  preferences: Preferences;
}
export function validateProfileUpdate(body: unknown): ProfileUpdate | null {
  const b = asObject(body);
  const name = asString(b.name).trim();
  const email = asString(b.email).trim();
  if (!name || !email) return null;
  return { name, email, bio: asString(b.bio).trim(), preferences: normalizePreferences(b.preferences) };
}

export interface LibraryUpsert {
  mediaItemId: string;
  status: LibraryStatus;
}
export function validateLibraryUpsert(body: unknown): LibraryUpsert | null {
  const b = asObject(body);
  const mediaItemId = asString(b.mediaItemId).trim();
  const status = asString(b.status).trim();
  if (!mediaItemId || !isLibraryStatus(status)) return null;
  return { mediaItemId, status };
}

export interface ReviewInput {
  entryId: string;
  rating: number;
  review: string;
}
export function validateReview(body: unknown): ReviewInput | null {
  const b = asObject(body);
  const entryId = asString(b.entryId).trim();
  const rating = typeof b.rating === "number" ? b.rating : Number(b.rating);
  if (!entryId || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return { entryId, rating, review: asString(b.review).trim() };
}

export interface CustomMedia {
  type: string;
  title: string;
  creator: string;
  genre: string;
  language: string;
  description: string;
  status: LibraryStatus;
  metadata: MediaItemMetadata | null;
  tags: string[];
}
export function validateCustomMedia(body: unknown): CustomMedia | null {
  const b = asObject(body);
  const title = asString(b.title).trim();
  const creator = asString(b.creator).trim();
  const genre = asString(b.genre).trim();
  const status = asString(b.status).trim();
  if (!title || !creator || !genre || !isLibraryStatus(status)) return null;
  // Type is open and data-driven; default to ebook for back-compat. Metadata is
  // validated into the domain union (null for unknown types), tags normalized.
  const type = asString(b.type).trim() || "ebook";
  if (type.length > MAX_TYPE_LENGTH) return null;
  return {
    type,
    title,
    creator,
    genre,
    language: asString(b.language).trim() || "English",
    description: asString(b.description).trim(),
    status,
    metadata: parseMediaMetadata(type, b.metadata),
    tags: normalizeTags(b.tags),
  };
}

export interface AddTrendingMedia {
  type: string;
  title: string;
  creator: string;
  genre: string;
  status: LibraryStatus;
  metadata: MediaItemMetadata | null;
  /** Provider cover art (https only); null when absent/insecure (cover-art Req 3.1). */
  artworkUrl: string | null;
}
export function validateAddTrending(body: unknown): AddTrendingMedia | null {
  const b = asObject(body);
  const title = asString(b.title).trim();
  const creator = asString(b.creator).trim();
  if (!title || !creator) return null;
  const type = asString(b.type).trim() || "ebook";
  if (type.length > MAX_TYPE_LENGTH) return null;
  const statusRaw = asString(b.status).trim();
  const status: LibraryStatus = isLibraryStatus(statusRaw) ? statusRaw : "wishlist";
  const artworkRaw = asString(b.artworkUrl).trim();
  return {
    type,
    title,
    creator,
    genre: asString(b.genre).trim(),
    status,
    metadata: parseMediaMetadata(type, b.metadata),
    artworkUrl: artworkRaw.startsWith("https://") ? artworkRaw : null,
  };
}

export interface TagsInput {
  entryId: string;
  tags: string[];
}
export function validateTags(body: unknown): TagsInput | null {
  const b = asObject(body);
  const entryId = asString(b.entryId).trim();
  if (!entryId) return null;
  return { entryId, tags: normalizeTags(b.tags) };
}

export interface ProgressInput {
  entryId: string;
  progress: number;
}
export function validateProgress(body: unknown): ProgressInput | null {
  const b = asObject(body);
  const entryId = asString(b.entryId).trim();
  const progress = typeof b.progress === "number" ? b.progress : Number(b.progress);
  if (!entryId || !Number.isInteger(progress) || progress < 0) return null;
  return { entryId, progress };
}

export interface GoalInput {
  period: string;
  periodKey: string | null;
  targetCount: number;
}
export function validateGoal(body: unknown): GoalInput | null {
  const b = asObject(body);
  const targetCount = typeof b.targetCount === "number" ? b.targetCount : Number(b.targetCount);
  if (!Number.isInteger(targetCount) || targetCount < 1) return null;
  const period = asString(b.period).trim() || "year";
  const periodKey = asString(b.periodKey).trim() || null;
  return { period, periodKey, targetCount };
}

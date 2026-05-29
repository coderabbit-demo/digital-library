/**
 * Pure request validators for the data API (DL-22..DL-26). Each returns a typed,
 * normalized value or null; handlers turn null into a 400.
 */
import { isLibraryStatus, type LibraryStatus, type Preferences } from "@/lib/types";
import { normalizePreferences } from "@/lib/preferences";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
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
  const status = asString(b.status);
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
  title: string;
  creator: string;
  genre: string;
  language: string;
  description: string;
  status: LibraryStatus;
}
export function validateCustomMedia(body: unknown): CustomMedia | null {
  const b = asObject(body);
  const title = asString(b.title).trim();
  const creator = asString(b.creator).trim();
  const genre = asString(b.genre).trim();
  const status = asString(b.status);
  if (!title || !creator || !genre || !isLibraryStatus(status)) return null;
  return {
    title,
    creator,
    genre,
    language: asString(b.language).trim() || "English",
    description: asString(b.description).trim(),
    status,
  };
}

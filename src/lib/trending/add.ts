/**
 * Add a trending item to a user's library (trending-now DL-57).
 *
 * Find-or-create the media item (type-scoped, de-duped), upsert the user's
 * library entry, and record the activity — reusing the existing library path so
 * a discovered item behaves like any other. Takes a `DbExecutor`; the caller
 * wraps it in a transaction so all three writes commit together.
 */
import type { DbExecutor } from "@/db/client";
import {
  findEntry,
  findOrCreateMedia,
  insertActivity,
  updateMediaArtwork,
  upsertEntryStatus,
} from "@/db/queries";
import { actionForStatus, detailForStatus } from "@/lib/activity";
import type { AddTrendingResponse, LibraryStatus, MediaItem, MediaItemMetadata } from "@/lib/types";

const COVER_THEMES = ["teal", "gold", "coral", "green", "violet", "navy", "crimson", "indigo"];

function pickCoverTheme(seed: string): string {
  let sum = 0;
  for (const ch of seed) sum += ch.charCodeAt(0);
  return COVER_THEMES[sum % COVER_THEMES.length] ?? "teal";
}

export interface AddTrendingInput {
  type: string;
  title: string;
  creator: string;
  genre: string;
  status: LibraryStatus;
  metadata: MediaItemMetadata | null;
  /** Provider cover art (https); persisted on create / fills a missing one (cover-art Req 3). */
  artworkUrl?: string | null;
}

export interface ResolveTrendingInput {
  type: string;
  title: string;
  creator: string;
  genre: string;
  metadata: MediaItemMetadata | null;
  artworkUrl?: string | null;
}

/**
 * Persist provider artwork onto a found-or-created media row (cover-art Req 3):
 * `created` rows already carry it from the insert; for an existing row that
 * lacks art, fill it from the provider — but never overwrite art already there.
 */
async function fillMissingArtwork(
  db: DbExecutor,
  media: MediaItem,
  created: boolean,
  artworkUrl: string | null | undefined,
  now: Date,
): Promise<void> {
  if (!created && artworkUrl && !media.artworkUrl) {
    await updateMediaArtwork(db, media.id, artworkUrl, now);
  }
}

/**
 * Resolve an external (trending) item to a catalog media id WITHOUT creating a
 * library entry (media-detail DL-67) — so "View details" on a trending item can
 * open /item/[id]. Atomic find-or-create on the natural key (DL-64). The caller
 * wraps it in a transaction.
 */
export async function resolveTrendingMedia(
  db: DbExecutor,
  input: ResolveTrendingInput,
): Promise<{ id: string; created: boolean }> {
  const { media, created } = await findOrCreateMedia(db, {
    type: input.type,
    title: input.title,
    creator: input.creator,
    genre: input.genre || "Unknown",
    language: "English",
    description: "",
    coverTheme: pickCoverTheme(`${input.title}-${input.creator}`),
    artworkUrl: input.artworkUrl ?? null,
    metadata: input.metadata,
    totalUnits: null,
  });
  await fillMissingArtwork(db, media, created, input.artworkUrl, new Date());
  return { id: media.id, created };
}

export async function addTrendingItem(
  db: DbExecutor,
  userId: string,
  input: AddTrendingInput,
  now: Date,
): Promise<AddTrendingResponse> {
  // Atomic find-or-create on the natural key (DL-64): the unique index makes
  // concurrent adds converge on one catalog row.
  const { media, created } = await findOrCreateMedia(db, {
    type: input.type,
    title: input.title,
    creator: input.creator,
    genre: input.genre || "Unknown",
    language: "English",
    description: "",
    coverTheme: pickCoverTheme(`${input.title}-${input.creator}`),
    artworkUrl: input.artworkUrl ?? null,
    metadata: input.metadata,
    totalUnits: null,
  });
  await fillMissingArtwork(db, media, created, input.artworkUrl, now);

  const owned = await findEntry(db, userId, media.id);
  const alreadyOwned = owned !== null;

  const entry = await upsertEntryStatus(db, {
    userId,
    mediaItemId: media.id,
    status: input.status,
    updatedAt: now,
  });
  await insertActivity(db, {
    userId,
    mediaItemId: media.id,
    action: actionForStatus(input.status),
    detail: detailForStatus(input.status, alreadyOwned),
    createdAt: now,
  });

  return { entry, created, alreadyOwned };
}

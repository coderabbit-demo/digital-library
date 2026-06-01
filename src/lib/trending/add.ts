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
  findMediaByTypeTitleCreator,
  insertActivity,
  insertMediaItem,
  upsertEntryStatus,
} from "@/db/queries";
import { actionForStatus, detailForStatus } from "@/lib/activity";
import type { AddTrendingResponse, LibraryStatus, MediaItemMetadata } from "@/lib/types";

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
}

export async function addTrendingItem(
  db: DbExecutor,
  userId: string,
  input: AddTrendingInput,
  now: Date,
): Promise<AddTrendingResponse> {
  const existingMedia = await findMediaByTypeTitleCreator(db, input.type, input.title, input.creator);
  const media =
    existingMedia ??
    (await insertMediaItem(db, {
      type: input.type,
      title: input.title,
      creator: input.creator,
      genre: input.genre || "Unknown",
      language: "English",
      description: "",
      coverTheme: pickCoverTheme(`${input.title}-${input.creator}`),
      metadata: input.metadata,
      totalUnits: null,
    }));

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

  return { entry, created: existingMedia === null, alreadyOwned };
}

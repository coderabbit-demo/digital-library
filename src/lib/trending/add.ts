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
  // Best-effort de-dup: find-then-create is not atomic, so two *concurrent*
  // adds of the same item could each insert a media row. The common case
  // (double-click) is prevented client-side (the add control disables while in
  // flight); the residual cross-request race would at worst create a duplicate
  // shared catalog row. A DB-level fix (a functional unique index on
  // media_items(type, lower(title), lower(creator)) + on-conflict) is tracked
  // as follow-up hardening — it also affects the existing custom-add path and
  // must reconcile pre-existing duplicates, so it is out of scope here.
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

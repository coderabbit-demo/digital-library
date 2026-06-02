/**
 * Resolve-and-persist a media item's cover (cover-art DL-75). Backs both the
 * on-demand POST /api/cover handler and the offline backfill script.
 *
 * Idempotent: an item that already has artwork or has been checked is returned
 * unchanged, so the same external lookup is never repeated (Req 4.5). A resolved
 * URL (or a definitive "none found") is stamped with the checked time; resolver
 * failures surface as a null URL, never an exception (Req 4.6).
 */
import type { DbExecutor } from "@/db/client";
import { findMediaById, updateMediaArtwork } from "@/db/queries";
import type { MediaItem } from "@/lib/types";
import type { CoverDeps } from "./http";
import { isSupportedCoverType, resolveCover } from "./resolve";

export type CoverOutcome =
  | { status: "not_found" }
  | { status: "cached" | "unsupported" | "resolved"; artworkUrl: string | null };

export interface ResolveAndPersistDeps {
  /** Override the resolver (tests / injected deps); defaults to resolveCover. */
  resolve?: (item: Pick<MediaItem, "type" | "title" | "creator">) => Promise<string | null>;
  /** Timestamp to stamp; defaults to now. */
  now?: Date;
  /** Forwarded to the default resolver (timeout, fetch impl). */
  coverDeps?: CoverDeps;
}

export async function resolveAndPersistCover(
  db: DbExecutor,
  mediaItemId: string,
  deps: ResolveAndPersistDeps = {},
): Promise<CoverOutcome> {
  const item = await findMediaById(db, mediaItemId);
  if (!item) return { status: "not_found" };

  // Already resolved or already attempted — no external call (idempotent).
  if (item.artworkUrl || item.artworkCheckedAt) {
    return { status: "cached", artworkUrl: item.artworkUrl ?? null };
  }

  const checkedAt = deps.now ?? new Date();

  if (!isSupportedCoverType(item.type)) {
    await updateMediaArtwork(db, item.id, null, checkedAt);
    return { status: "unsupported", artworkUrl: null };
  }

  const resolve = deps.resolve ?? ((i) => resolveCover(i, deps.coverDeps));
  const artworkUrl = await resolve(item);
  await updateMediaArtwork(db, item.id, artworkUrl, checkedAt);
  return { status: "resolved", artworkUrl };
}

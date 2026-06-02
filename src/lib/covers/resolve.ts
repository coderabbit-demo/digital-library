/**
 * Cover-resolution dispatcher (cover-art DL-75, Req 4.1, 4.7).
 *
 * Routes an item to the keyless source for its media type and returns a single
 * validated https cover URL or null. Unsupported types short-circuit to null
 * without any external call. Never throws — the underlying clients map all
 * failures to null (Req 4.6).
 */
import type { MediaItem } from "@/lib/types";
import type { CoverDeps } from "./http";
import { resolveItunesCover } from "./itunes";
import { resolveOpenLibraryCover } from "./openlibrary";

/** iTunes entities tried per media type (first confident match wins). */
const ITUNES_ENTITIES: Record<string, readonly string[]> = {
  music: ["album"],
  podcast: ["podcast"],
  tv_movie: ["movie", "tvSeason"],
};

export function isSupportedCoverType(type: string): boolean {
  return type === "ebook" || type in ITUNES_ENTITIES;
}

export function resolveCover(
  item: Pick<MediaItem, "type" | "title" | "creator">,
  deps: CoverDeps = {},
): Promise<string | null> {
  if (item.type === "ebook") return resolveOpenLibraryCover(item.title, item.creator, deps);
  const entities = ITUNES_ENTITIES[item.type];
  if (entities) return resolveItunesCover(item.title, item.creator, entities, deps);
  return Promise.resolve(null);
}

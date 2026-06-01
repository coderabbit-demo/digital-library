/**
 * Match trending items against a user's library (trending-now DL-59).
 *
 * Uses the same type-scoped, case-insensitive key as the add-time de-dup
 * (`findMediaByTypeTitleCreator`) so "already in library" on a card agrees with
 * what adding would do. Pure.
 */
import type { LibraryEntry, MediaItem } from "@/lib/types";

export function trendingItemKey(item: { mediaType: string; title: string; creator: string }): string {
  return `${item.mediaType}|${item.title.trim().toLowerCase()}|${item.creator.trim().toLowerCase()}`;
}

export function ownedTrendingKeys(
  entries: readonly LibraryEntry[],
  media: readonly MediaItem[],
): Set<string> {
  const byId = new Map(media.map((m) => [m.id, m]));
  const keys = new Set<string>();
  for (const entry of entries) {
    const item = byId.get(entry.mediaItemId);
    if (item) keys.add(trendingItemKey({ mediaType: item.type, title: item.title, creator: item.creator }));
  }
  return keys;
}

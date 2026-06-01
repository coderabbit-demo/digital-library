/**
 * Media-type filtering for the trending feed (media-type-filters DL-73).
 *
 * Pure transforms over an already-fetched `TrendingResponse` — they never
 * trigger a source fetch (Req 2.4), so the page fetches once and narrows in
 * memory. A specific selection keeps only matching items and drops source
 * groups left empty (Req 2.2); "all" returns the feed unchanged (Req 2.3).
 */
import type { TrendingResponse } from "@/lib/types";

/** Distinct media types present across healthy (ok) sources, for option building. */
export function trendingMediaTypes(feed: TrendingResponse): string[] {
  const seen = new Set<string>();
  for (const source of feed.sources) {
    if (source.status !== "ok") continue;
    for (const item of source.items) seen.add(item.mediaType);
  }
  return [...seen];
}

/**
 * Narrow the feed to a single media type. "all" returns the input unchanged;
 * otherwise keep each source's matching items and drop sources left with none.
 */
export function filterTrendingFeed(feed: TrendingResponse, type: string): TrendingResponse {
  if (type === "all") return feed;
  const sources = feed.sources
    .map((source) => ({ ...source, items: source.items.filter((item) => item.mediaType === type) }))
    .filter((source) => source.items.length > 0);
  return { sources };
}

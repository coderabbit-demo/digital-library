/**
 * Apple Podcasts — the podcasts provider for Trending Now (trending-podcasts-tv-movies).
 *
 * Keyless: Apple's public RSS marketing charts feed needs no credentials. One
 * server-side call returns the current top shows; the array order is the chart
 * rank. The response is cached via the Next Data Cache. `normalizeApplePodcasts`
 * is pure and unit-tested.
 */
import type { TrendingItem } from "@/lib/types";
import type { TrendingFetchOptions, TrendingProvider } from "./provider";

const CHARTS_BASE = "https://rss.marketingtools.apple.com/api/v2/us/podcasts/top";
const REVALIDATE_SECONDS = 3600;
const MAX_LIMIT = 100;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function httpsOrNull(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

interface AppleResult {
  id?: string;
  name?: string;
  artistName?: string;
  artworkUrl100?: string;
  url?: string;
  genres?: { name?: string }[];
}

/** Pure: Apple charts payload → normalized, capped TrendingItems (rank = order). */
export function normalizeApplePodcasts(payload: unknown, limit: number): TrendingItem[] {
  const results = isRecord(payload) && isRecord(payload.feed) && Array.isArray(payload.feed.results)
    ? (payload.feed.results as AppleResult[])
    : [];
  const items: TrendingItem[] = [];

  for (const entry of results) {
    const title = text(entry.name);
    if (!title) continue;
    const genre = Array.isArray(entry.genres) ? text(entry.genres[0]?.name) : "";
    const artwork = text(entry.artworkUrl100).replace(/100x100bb/, "600x600bb");
    items.push({
      source: "apple-podcasts",
      sourceLabel: "Apple Podcasts",
      mediaType: "podcast",
      title,
      creator: text(entry.artistName) || "Unknown",
      listLabel: "Top Shows",
      rank: items.length + 1,
      genre: genre || null,
      artworkUrl: httpsOrNull(artwork),
      externalUrl: httpsOrNull(entry.url),
      externalId: text(entry.id) || null,
    });
    if (items.length >= limit) break;
  }
  return items;
}

export const applePodcastsProvider: TrendingProvider = {
  id: "apple-podcasts",
  label: "Apple Podcasts",
  mediaType: "podcast",
  isConfigured: () => true, // keyless public feed
  async fetchTrending({ limit, fetchImpl }: TrendingFetchOptions): Promise<TrendingItem[]> {
    const count = Math.min(Math.max(limit, 1), MAX_LIMIT);
    const doFetch = fetchImpl ?? fetch;
    const url = `${CHARTS_BASE}/${count}/podcasts.json`;
    const res = await doFetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`Apple Podcasts request failed: ${res.status}`);
    return normalizeApplePodcasts(await res.json(), limit);
  },
};

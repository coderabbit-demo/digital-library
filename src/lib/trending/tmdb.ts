/**
 * TMDB — the TV & movie providers for Trending Now (trending-podcasts-tv-movies).
 *
 * Two providers (Trending Movies, Trending TV), both mapped to the `tv_movie`
 * media type, share this client. The API key is read from the environment and
 * never leaves the server; responses are cached via the Next Data Cache. TMDB's
 * trending payload carries no creator/cast, so `creator` is left empty (the
 * poster is still surfaced as artwork). `normalizeTmdb` is pure and unit-tested.
 */
import type { TrendingItem } from "@/lib/types";
import type { TrendingFetchOptions, TrendingProvider } from "./provider";

const TRENDING_BASE = "https://api.themoviedb.org/3/trending";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const SITE_BASE = "https://www.themoviedb.org";
const REVALIDATE_SECONDS = 3600;

export type TmdbKind = "movie" | "tv";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function httpsOrNull(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

interface TmdbResult {
  id?: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
}

const KIND_META: Record<TmdbKind, { source: string; label: string }> = {
  movie: { source: "tmdb-movies", label: "Trending Movies" },
  tv: { source: "tmdb-tv", label: "Trending TV" },
};

/** Pure: TMDB trending payload → normalized, capped TrendingItems for one kind. */
export function normalizeTmdb(payload: unknown, kind: TmdbKind, limit: number): TrendingItem[] {
  const results = isRecord(payload) && Array.isArray(payload.results)
    ? (payload.results as TmdbResult[])
    : [];
  const meta = KIND_META[kind];
  const items: TrendingItem[] = [];

  for (const entry of results) {
    const title = text(entry.title) || text(entry.name);
    if (!title) continue;
    const poster = text(entry.poster_path);
    const id = typeof entry.id === "number" ? entry.id : null;
    items.push({
      source: meta.source,
      sourceLabel: meta.label,
      mediaType: "tv_movie",
      title,
      creator: "", // TMDB trending carries no creator/cast
      listLabel: meta.label,
      rank: items.length + 1,
      genre: null,
      artworkUrl: poster ? httpsOrNull(`${IMAGE_BASE}${poster}`) : null,
      externalUrl: id !== null ? httpsOrNull(`${SITE_BASE}/${kind}/${id}`) : null,
      externalId: id !== null ? `${kind}:${id}` : null,
    });
    if (items.length >= limit) break;
  }
  return items;
}

function tmdbProvider(kind: TmdbKind): TrendingProvider {
  const meta = KIND_META[kind];
  return {
    id: meta.source,
    label: meta.label,
    mediaType: "tv_movie",
    isConfigured: (env) => text(env.TMDB_API_KEY).length > 0,
    async fetchTrending({ limit, fetchImpl }: TrendingFetchOptions): Promise<TrendingItem[]> {
      const key = text(process.env.TMDB_API_KEY);
      if (!key) throw new Error("TMDB_API_KEY is not configured");
      const doFetch = fetchImpl ?? fetch;
      const url = `${TRENDING_BASE}/${kind}/week?api_key=${encodeURIComponent(key)}`;
      const res = await doFetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
      if (!res.ok) throw new Error(`TMDB ${kind} request failed: ${res.status}`);
      return normalizeTmdb(await res.json(), kind, limit);
    },
  };
}

export const tmdbMoviesProvider: TrendingProvider = tmdbProvider("movie");
export const tmdbTvProvider: TrendingProvider = tmdbProvider("tv");

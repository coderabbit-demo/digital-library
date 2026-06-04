/**
 * TMDB — the TV and movie search providers (media-search DL-82). Keyed by the
 * existing TMDB_API_KEY; one normalizer parameterized by kind; two providers.
 */
import { fetchJson, httpsOrNull, isRecord } from "@/lib/covers/http";
import type { TrendingItem } from "@/lib/types";
import type { SearchFetchOptions, SearchProvider } from "./provider";

const SEARCH_BASE = "https://api.themoviedb.org/3/search";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const SITE_BASE = "https://www.themoviedb.org";

export type TmdbKind = "movie" | "tv";

interface TmdbResult {
  id?: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
}

const KIND_META: Record<TmdbKind, { id: string; label: string; listLabel: string }> = {
  movie: { id: "tmdb-movies", label: "TMDB Movies", listLabel: "Movies" },
  tv: { id: "tmdb-tv", label: "TMDB TV", listLabel: "TV Shows" },
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Pure: TMDB search payload → normalized, capped TrendingItems for one kind. */
export function normalizeTmdbSearch(payload: unknown, kind: TmdbKind, limit: number): TrendingItem[] {
  const results = isRecord(payload) && Array.isArray(payload.results) ? (payload.results as TmdbResult[]) : [];
  const meta = KIND_META[kind];
  const items: TrendingItem[] = [];
  for (const r of results) {
    const title = text(r.title) || text(r.name);
    if (!title) continue;
    const poster = text(r.poster_path);
    const id = typeof r.id === "number" ? r.id : null;
    items.push({
      source: meta.id,
      sourceLabel: meta.label,
      mediaType: kind,
      title,
      creator: "",
      listLabel: meta.listLabel,
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

function tmdbProvider(kind: TmdbKind): SearchProvider {
  const meta = KIND_META[kind];
  return {
    id: meta.id,
    label: meta.label,
    mediaType: kind,
    isConfigured: (env) => text(env.TMDB_API_KEY).length > 0,
    async search(query: string, { limit, fetchImpl, env }: SearchFetchOptions): Promise<TrendingItem[]> {
      const key = text((env ?? process.env).TMDB_API_KEY);
      if (!key) throw new Error("TMDB_API_KEY is not configured");
      const url =
        `${SEARCH_BASE}/${kind}?query=${encodeURIComponent(query)}&include_adult=false` +
        `&api_key=${encodeURIComponent(key)}`;
      const data = await fetchJson(url, { fetchImpl, timeoutMs: 5000 });
      return normalizeTmdbSearch(data, kind, limit);
    },
  };
}

export const tmdbMoviesSearchProvider: SearchProvider = tmdbProvider("movie");
export const tmdbTvSearchProvider: SearchProvider = tmdbProvider("tv");

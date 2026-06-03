/**
 * iTunes Search — the music and podcast search providers (media-search DL-82).
 * Keyless. One normalizer parameterized by media type / entity; two providers.
 */
import { fetchJson, httpsOrNull, isRecord } from "@/lib/covers/http";
import type { TrendingItem, TrendingMediaType } from "@/lib/types";
import type { SearchFetchOptions, SearchProvider } from "./provider";

const SEARCH_URL = "https://itunes.apple.com/search";

interface ItunesResult {
  collectionName?: string;
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  collectionViewUrl?: string;
  trackViewUrl?: string;
  collectionId?: number;
  trackId?: number;
}

interface ItunesKind {
  id: string;
  label: string;
  mediaType: TrendingMediaType;
  entity: string;
  listLabel: string;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Pure: iTunes search payload → normalized, capped TrendingItems for one kind. */
export function normalizeItunesSearch(payload: unknown, kind: ItunesKind, limit: number): TrendingItem[] {
  const results = isRecord(payload) && Array.isArray(payload.results) ? (payload.results as ItunesResult[]) : [];
  const items: TrendingItem[] = [];
  for (const r of results) {
    const title = text(r.collectionName) || text(r.trackName);
    if (!title) continue;
    const art = text(r.artworkUrl100).replace(/100x100bb/, "600x600bb");
    const id = typeof r.collectionId === "number" ? r.collectionId : r.trackId;
    items.push({
      source: kind.id,
      sourceLabel: kind.label,
      mediaType: kind.mediaType,
      title,
      creator: text(r.artistName) || "Unknown",
      listLabel: kind.listLabel,
      rank: items.length + 1,
      genre: null,
      artworkUrl: httpsOrNull(art),
      externalUrl: httpsOrNull(r.collectionViewUrl) ?? httpsOrNull(r.trackViewUrl),
      externalId: typeof id === "number" ? String(id) : null,
    });
    if (items.length >= limit) break;
  }
  return items;
}

function itunesProvider(kind: ItunesKind): SearchProvider {
  return {
    id: kind.id,
    label: kind.label,
    mediaType: kind.mediaType,
    isConfigured: () => true, // keyless
    async search(query: string, { limit, fetchImpl }: SearchFetchOptions): Promise<TrendingItem[]> {
      const url =
        `${SEARCH_URL}?term=${encodeURIComponent(query)}&entity=${kind.entity}` +
        `&limit=${encodeURIComponent(String(limit))}&country=US`;
      const data = await fetchJson(url, { fetchImpl, timeoutMs: 5000 });
      return normalizeItunesSearch(data, kind, limit);
    },
  };
}

export const ITUNES_MUSIC: ItunesKind = {
  id: "itunes-music",
  label: "Apple Music",
  mediaType: "music",
  entity: "album",
  listLabel: "Music",
};
export const ITUNES_PODCASTS: ItunesKind = {
  id: "itunes-podcasts",
  label: "Apple Podcasts",
  mediaType: "podcast",
  entity: "podcast",
  listLabel: "Podcasts",
};

export const itunesMusicProvider: SearchProvider = itunesProvider(ITUNES_MUSIC);
export const itunesPodcastsProvider: SearchProvider = itunesProvider(ITUNES_PODCASTS);

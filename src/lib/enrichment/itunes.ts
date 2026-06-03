/**
 * iTunes enrichment for music and podcasts (media-detail-enrichment Req 1.4,
 * 1.5). Keyless. Music albums yield genre/release date/track count; podcasts
 * yield publisher (artist), episode count (track count), and genre. Never throws.
 */
import { fetchJson, isRecord } from "@/lib/covers/http";
import {
  compactEnrichment,
  coverDeps,
  type EnrichmentFetchDeps,
  type EnrichmentOf,
  nonNegInt,
  text,
} from "./provider";

const SEARCH_URL = "https://itunes.apple.com/search";

function firstResult(payload: unknown): Record<string, unknown> | null {
  const results = isRecord(payload) && Array.isArray(payload.results) ? payload.results : [];
  const first = results[0];
  return isRecord(first) ? first : null;
}

/** Pure: an iTunes album result → a music partial. */
export function normalizeItunesAlbum(payload: unknown): EnrichmentOf<"music"> | null {
  const r = firstResult(payload);
  if (!r) return null;
  return compactEnrichment("music", {
    genre: text(r.primaryGenreName),
    releaseDate: text(r.releaseDate),
    trackCount: nonNegInt(r.trackCount),
  });
}

/** Pure: an iTunes podcast result → a podcast partial. */
export function normalizeItunesPodcast(payload: unknown): EnrichmentOf<"podcast"> | null {
  const r = firstResult(payload);
  if (!r) return null;
  return compactEnrichment("podcast", {
    publisher: text(r.artistName),
    episodeCount: nonNegInt(r.trackCount),
    genre: text(r.primaryGenreName),
  });
}

function searchUrl(term: string, entity: string): string {
  return `${SEARCH_URL}?term=${encodeURIComponent(term)}&entity=${entity}&limit=1&country=US`;
}

export async function enrichMusicFromItunes(
  item: { title: string; creator: string },
  deps: EnrichmentFetchDeps = {},
): Promise<EnrichmentOf<"music"> | null> {
  const term = `${item.title} ${item.creator}`.trim();
  const data = await fetchJson(searchUrl(term, "album"), coverDeps(deps));
  return normalizeItunesAlbum(data);
}

export async function enrichPodcastFromItunes(
  item: { title: string; creator: string },
  deps: EnrichmentFetchDeps = {},
): Promise<EnrichmentOf<"podcast"> | null> {
  const term = `${item.title} ${item.creator}`.trim();
  const data = await fetchJson(searchUrl(term, "podcast"), coverDeps(deps));
  return normalizeItunesPodcast(data);
}

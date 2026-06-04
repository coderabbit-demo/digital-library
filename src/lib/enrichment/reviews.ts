/**
 * Transient review excerpts for the detail page (media-detail-enrichment Req
 * 4.2, 5). Read-only and fetched per view (never persisted): only movies/TV
 * have a free source (TMDB user reviews). Excerpts are plain text, length-
 * bounded with a truncation flag, attributed, and carry an https-only outbound
 * link. Returns [] for any other type or on any failure — never throws.
 */
import { fetchJson, httpsOrNull, isRecord } from "@/lib/covers/http";
import type { MediaEnrichment, MediaItem } from "@/lib/types";
import { coverDeps, type EnrichmentFetchDeps, enrichmentEnv, numberInRange, text } from "./provider";

const DETAIL_BASE = "https://api.themoviedb.org/3";
/** Up to this many excerpts, each capped to this many characters. */
export const REVIEW_EXCERPT_LIMIT = 3;
export const REVIEW_EXCERPT_MAX_CHARS = 360;

export interface ReviewExcerpt {
  source: "tmdb";
  author: string;
  excerpt: string;
  truncated: boolean;
  rating: number | null;
  url: string | null;
}

function truncate(body: string): { excerpt: string; truncated: boolean } {
  if (body.length <= REVIEW_EXCERPT_MAX_CHARS) return { excerpt: body, truncated: false };
  // Cut at the last word boundary within the cap to avoid mid-word breaks.
  const slice = body.slice(0, REVIEW_EXCERPT_MAX_CHARS);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > REVIEW_EXCERPT_MAX_CHARS * 0.6 ? slice.slice(0, lastSpace) : slice;
  return { excerpt: `${cut.trimEnd()}…`, truncated: true };
}

/** Pure: a TMDB reviews payload → capped, plain-text, safe excerpts. */
export function normalizeTmdbReviews(payload: unknown): ReviewExcerpt[] {
  const results = isRecord(payload) && Array.isArray(payload.results) ? payload.results : [];
  const out: ReviewExcerpt[] = [];
  for (const r of results) {
    if (!isRecord(r)) continue;
    const body = text(r.content);
    const author = text(r.author);
    if (!body || !author) continue;
    const details = isRecord(r.author_details) ? r.author_details : {};
    const { excerpt, truncated } = truncate(body);
    out.push({
      source: "tmdb",
      author,
      excerpt,
      truncated,
      rating: numberInRange(details.rating, 0, 10) ?? null,
      url: httpsOrNull(r.url),
    });
    if (out.length >= REVIEW_EXCERPT_LIMIT) break;
  }
  return out;
}

/** Fetch a few TMDB review excerpts for a movie/TV item; [] otherwise/on failure. */
export async function fetchReviewExcerpts(
  item: Pick<MediaItem, "type"> & { enrichment?: MediaEnrichment | null },
  deps: EnrichmentFetchDeps = {},
): Promise<ReviewExcerpt[]> {
  if (item.type !== "movie" && item.type !== "tv" && item.type !== "tv_movie") return [];
  const enrichment = item.enrichment;
  if (!enrichment || enrichment.kind !== "video" || typeof enrichment.tmdbId !== "number") return [];

  const key = text(enrichmentEnv(deps).TMDB_API_KEY);
  if (!key) return [];
  const tmdbType = enrichment.tmdbType ?? "movie";
  const url = `${DETAIL_BASE}/${tmdbType}/${enrichment.tmdbId}/reviews?api_key=${encodeURIComponent(key)}`;
  const data = await fetchJson(url, coverDeps(deps));
  return normalizeTmdbReviews(data);
}

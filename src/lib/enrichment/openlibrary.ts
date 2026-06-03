/**
 * Open Library enrichment for books (media-detail-enrichment Req 1.3). Keyless.
 * Searches for the work to collect subjects, then reads its ratings summary.
 * Contributes subjects (as categories) and the Open Library rating score.
 * Never throws.
 */
import { fetchJson, isRecord } from "@/lib/covers/http";
import {
  compactEnrichment,
  coverDeps,
  type EnrichmentFetchDeps,
  type EnrichmentOf,
  nonNegInt,
  numberInRange,
  text,
  textList,
} from "./provider";

const SEARCH_URL = "https://openlibrary.org/search.json";
const WORKS_BASE = "https://openlibrary.org";

interface OpenLibraryWork {
  workKey: string | null;
  subjects: string[] | undefined;
}

/** Pure: a search.json payload → the first work's key and subjects. */
export function normalizeOpenLibrarySearch(payload: unknown): OpenLibraryWork {
  const docs = isRecord(payload) && Array.isArray(payload.docs) ? payload.docs : [];
  const first = docs[0];
  if (!isRecord(first)) return { workKey: null, subjects: undefined };
  return {
    workKey: text(first.key) ?? null,
    subjects: Array.isArray(first.subject) ? textList(first.subject) : undefined,
  };
}

/** Pure: a ratings.json payload → average and count (0–5 scale). */
export function normalizeOpenLibraryRatings(payload: unknown): {
  rating: number | undefined;
  count: number | undefined;
} {
  const summary = isRecord(payload) && isRecord(payload.summary) ? payload.summary : null;
  if (!summary) return { rating: undefined, count: undefined };
  return {
    rating: numberInRange(summary.average, 0, 5),
    count: nonNegInt(summary.count),
  };
}

/** Query Open Library for a book's subjects + rating; returns a partial or null. */
export async function enrichFromOpenLibrary(
  item: { title: string; creator: string },
  deps: EnrichmentFetchDeps = {},
): Promise<EnrichmentOf<"ebook"> | null> {
  const cd = coverDeps(deps);
  const params = new URLSearchParams({
    title: item.title.trim(),
    fields: "key,subject",
    limit: "1",
  });
  if (item.creator.trim()) params.set("author", item.creator.trim());
  const search = await fetchJson(`${SEARCH_URL}?${params.toString()}`, cd);
  const { workKey, subjects } = normalizeOpenLibrarySearch(search);

  let rating: number | undefined;
  let count: number | undefined;
  if (workKey && workKey.startsWith("/works/")) {
    const ratings = await fetchJson(`${WORKS_BASE}${workKey}/ratings.json`, cd);
    ({ rating, count } = normalizeOpenLibraryRatings(ratings));
  }

  return compactEnrichment("ebook", {
    categories: subjects,
    openLibraryRating: rating,
    openLibraryRatingsCount: count,
  });
}

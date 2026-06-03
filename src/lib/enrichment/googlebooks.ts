/**
 * Google Books enrichment for books (media-detail-enrichment Req 1.3, 6.1, 6.3).
 * Keyed by GOOGLE_BOOKS_API_KEY; when the key is absent the source is skipped
 * (returns null) so books still enrich from the keyless Open Library source.
 * Never throws.
 */
import { fetchJson, isRecord } from "@/lib/covers/http";
import {
  compactEnrichment,
  coverDeps,
  type EnrichmentFetchDeps,
  type EnrichmentOf,
  enrichmentEnv,
  nonNegInt,
  numberInRange,
  text,
  textList,
} from "./provider";

const VOLUMES_URL = "https://www.googleapis.com/books/v1/volumes";

/** Pure: a Google Books volume's `volumeInfo` → an ebook partial (no ratings merge). */
export function normalizeGoogleBooksVolume(payload: unknown): EnrichmentOf<"ebook"> | null {
  if (!isRecord(payload)) return null;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const first = items[0];
  const info = isRecord(first) && isRecord(first.volumeInfo) ? first.volumeInfo : null;
  if (!info) return null;

  let isbn10: string | undefined;
  let isbn13: string | undefined;
  if (Array.isArray(info.industryIdentifiers)) {
    for (const ident of info.industryIdentifiers) {
      if (!isRecord(ident)) continue;
      if (ident.type === "ISBN_10") isbn10 = text(ident.identifier);
      if (ident.type === "ISBN_13") isbn13 = text(ident.identifier);
    }
  }

  return compactEnrichment("ebook", {
    pageCount: nonNegInt(info.pageCount),
    publisher: text(info.publisher),
    publishedDate: text(info.publishedDate),
    categories: Array.isArray(info.categories) ? textList(info.categories) : undefined,
    isbn10,
    isbn13,
    averageRating: numberInRange(info.averageRating, 0, 5),
    ratingsCount: nonNegInt(info.ratingsCount),
  });
}

export function isGoogleBooksConfigured(env: Record<string, string | undefined>): boolean {
  return (text(env.GOOGLE_BOOKS_API_KEY) ?? "").length > 0;
}

/** Query Google Books for a book and return its partial enrichment, or null. */
export async function enrichFromGoogleBooks(
  item: { title: string; creator: string },
  deps: EnrichmentFetchDeps = {},
): Promise<EnrichmentOf<"ebook"> | null> {
  const key = text(enrichmentEnv(deps).GOOGLE_BOOKS_API_KEY);
  if (!key) return null;
  const q = `intitle:${item.title.trim()}${item.creator.trim() ? ` inauthor:${item.creator.trim()}` : ""}`;
  const url = `${VOLUMES_URL}?q=${encodeURIComponent(q)}&maxResults=1&country=US&key=${encodeURIComponent(key)}`;
  const data = await fetchJson(url, coverDeps(deps));
  return normalizeGoogleBooksVolume(data);
}

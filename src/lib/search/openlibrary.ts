/**
 * Open Library — the books search provider (media-search DL-82). Keyless Search
 * API; cover built by id. Normalizes into the shared TrendingItem shape.
 */
import { fetchJson, httpsOrNull, isRecord } from "@/lib/covers/http";
import type { TrendingItem } from "@/lib/types";
import type { SearchFetchOptions, SearchProvider } from "./provider";

const SEARCH_URL = "https://openlibrary.org/search.json";
const COVER_BASE = "https://covers.openlibrary.org/b/id";
const SITE_BASE = "https://openlibrary.org";
const USER_AGENT = "LibraryLoop/1.0 (media search)";

interface OLDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Pure: Open Library search payload → normalized, capped TrendingItems. */
export function normalizeOpenLibrarySearch(payload: unknown, limit: number): TrendingItem[] {
  const docs = isRecord(payload) && Array.isArray(payload.docs) ? (payload.docs as OLDoc[]) : [];
  const items: TrendingItem[] = [];
  for (const doc of docs) {
    const title = text(doc.title);
    if (!title) continue;
    const authors = Array.isArray(doc.author_name)
      ? doc.author_name.filter((a): a is string => typeof a === "string")
      : [];
    const key = text(doc.key);
    items.push({
      source: "openlibrary",
      sourceLabel: "Open Library",
      mediaType: "ebook",
      title,
      creator: authors.join(", ") || "Unknown",
      listLabel: "Books",
      rank: items.length + 1,
      genre: null,
      artworkUrl: typeof doc.cover_i === "number" ? httpsOrNull(`${COVER_BASE}/${doc.cover_i}-M.jpg`) : null,
      externalUrl: key ? httpsOrNull(`${SITE_BASE}${key}`) : null,
      externalId: key || null,
    });
    if (items.length >= limit) break;
  }
  return items;
}

export const openLibraryBooksProvider: SearchProvider = {
  id: "openlibrary",
  label: "Open Library",
  mediaType: "ebook",
  isConfigured: () => true, // keyless
  async search(query: string, { limit, fetchImpl }: SearchFetchOptions): Promise<TrendingItem[]> {
    const url =
      `${SEARCH_URL}?q=${encodeURIComponent(query)}&fields=key,title,author_name,cover_i` +
      `&limit=${encodeURIComponent(String(limit))}`;
    const data = await fetchJson(url, { fetchImpl, timeoutMs: 5000 }, {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    });
    return normalizeOpenLibrarySearch(data, limit);
  },
};

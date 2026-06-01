/**
 * NYT Best Sellers — the books provider for Trending Now (DL-54).
 *
 * One server-side call to the list "overview" endpoint returns the current top
 * books for every list at once; we normalize and de-duplicate across lists. The
 * key is read from the environment and never leaves the server; the upstream
 * response is cached via the Next Data Cache (revalidation window) to respect
 * NYT's low rate limits. `normalizeNytOverview` is pure and unit-tested.
 */
import type { TrendingItem } from "@/lib/types";
import type { TrendingFetchOptions, TrendingProvider } from "./provider";

const NYT_OVERVIEW_URL = "https://api.nytimes.com/svc/books/v3/lists/overview.json";
const REVALIDATE_SECONDS = 3600;

interface NytBook {
  rank?: number;
  title?: string;
  author?: string;
  primary_isbn13?: string;
  book_image?: string;
  amazon_product_url?: string;
}
interface NytList {
  list_name?: string;
  books?: NytBook[];
}
interface NytOverview {
  results?: { lists?: NytList[] };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function httpsOrNull(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}

/** Pure: NYT overview payload → de-duped, capped TrendingItems. */
export function normalizeNytOverview(payload: unknown, limit: number): TrendingItem[] {
  const lists = (payload as NytOverview | null)?.results?.lists ?? [];
  const seen = new Set<string>();
  const items: TrendingItem[] = [];

  for (const list of lists) {
    const listLabel = text(list.list_name) || "Best Sellers";
    for (const book of list.books ?? []) {
      const title = text(book.title);
      if (!title) continue;
      const creator = text(book.author) || "Unknown";
      const isbn = text(book.primary_isbn13);
      const dedupKey = isbn || `${title.toLowerCase()}|${creator.toLowerCase()}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      items.push({
        source: "nyt",
        sourceLabel: "NYT Best Sellers",
        mediaType: "ebook",
        title,
        creator,
        listLabel,
        rank: typeof book.rank === "number" ? book.rank : null,
        genre: null,
        artworkUrl: httpsOrNull(book.book_image),
        externalUrl: httpsOrNull(book.amazon_product_url),
        externalId: isbn || null,
      });
      if (items.length >= limit) return items;
    }
  }
  return items;
}

export const nytBooksProvider: TrendingProvider = {
  id: "nyt",
  label: "NYT Best Sellers",
  mediaType: "ebook",
  isConfigured: (env) => text(env.NYT_API_KEY).length > 0,
  async fetchTrending({ limit, fetchImpl }: TrendingFetchOptions): Promise<TrendingItem[]> {
    const key = text(process.env.NYT_API_KEY);
    if (!key) throw new Error("NYT_API_KEY is not configured");
    const doFetch = fetchImpl ?? fetch;
    const url = `${NYT_OVERVIEW_URL}?api-key=${encodeURIComponent(key)}`;
    const res = await doFetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`NYT request failed: ${res.status}`);
    return normalizeNytOverview(await res.json(), limit);
  },
};

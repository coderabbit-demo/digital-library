/**
 * Open Library cover client for ebooks (cover-art DL-75).
 *
 * Keyless: the Search API resolves title/author to a cover id, and the cover is
 * fetched by id — the cover-by-id endpoint is not rate-limited. A candidate is
 * only accepted when it passes the match rule, and the returned URL is https.
 */
import { coverMatches } from "./match";
import { type CoverDeps, fetchJson, httpsOrNull, isRecord } from "./http";

const SEARCH_URL = "https://openlibrary.org/search.json";
const COVER_BASE = "https://covers.openlibrary.org/b/id";
const USER_AGENT = "LibraryLoop/1.0 (cover lookup)";

export async function resolveOpenLibraryCover(
  title: string,
  creator: string,
  deps: CoverDeps = {},
): Promise<string | null> {
  const url =
    `${SEARCH_URL}?title=${encodeURIComponent(title)}&author=${encodeURIComponent(creator)}` +
    `&fields=cover_i,title,author_name&limit=5`;
  const data = await fetchJson(url, deps, { "User-Agent": USER_AGENT, Accept: "application/json" });
  const docs = isRecord(data) && Array.isArray(data.docs) ? data.docs : [];

  for (const doc of docs) {
    if (!isRecord(doc) || typeof doc.cover_i !== "number") continue;
    const candTitle = typeof doc.title === "string" ? doc.title : "";
    const authors = Array.isArray(doc.author_name)
      ? doc.author_name.filter((a): a is string => typeof a === "string")
      : [];
    if (coverMatches({ title, creator }, { title: candTitle, creator: authors.join(", ") })) {
      return httpsOrNull(`${COVER_BASE}/${doc.cover_i}-M.jpg`);
    }
  }
  return null;
}

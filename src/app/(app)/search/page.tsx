import { redirect } from "next/navigation";
import { TrendingCard } from "@/components/trending/TrendingCard";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { searchMedia } from "@/lib/search/search";
import { ownedTrendingKeys, trendingItemKey } from "@/lib/trending/ownership";
import type { TrendingResponse } from "@/lib/types";

/**
 * Global search results (media-search DL-82): runs the search fan-out across the
 * configured providers for the submitted query (server-side, auth-gated) and
 * renders the matches grouped by source using the trending card (Add + Details),
 * flagging items already in the library. Empty query shows a prompt.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const db = getDb();
  let feed: TrendingResponse = { sources: [] };
  let owned = new Set<string>();
  if (query) {
    const [results, entries, media] = await Promise.all([
      searchMedia({ query, limit: 8 }),
      listEntriesForUser(db, user.id),
      listMedia(db),
    ]);
    feed = results;
    owned = ownedTrendingKeys(entries, media);
  }
  const groups = feed.sources.filter((s) => s.status === "ok" && s.items.length > 0);

  return (
    <section aria-labelledby="search-title" className="flex flex-col gap-6">
      <div>
        <h1 id="search-title" className="text-2xl font-medium">
          Search
        </h1>
        <p className="text-muted-foreground">
          {query
            ? `Results for “${query}”`
            : "Search across books, music, podcasts, and TV & movies."}
        </p>
      </div>

      {!query ? (
        <p className="py-4 text-muted-foreground" role="status">
          Enter a search in the bar above to find media to add to your library.
        </p>
      ) : groups.length === 0 ? (
        <p className="py-4 text-muted-foreground" role="status">
          No results found for “{query}”.
        </p>
      ) : null}

      {groups.map((source) => (
        <section key={source.source} aria-labelledby={`search-${source.source}`} className="flex flex-col gap-3">
          <h2 id={`search-${source.source}`} className="text-lg font-medium">
            {source.label}
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {source.items.map((item) => (
              <li key={`${item.source}-${item.externalId ?? item.title}`}>
                <TrendingCard
                  item={item}
                  alreadyInLibrary={owned.has(trendingItemKey(item))}
                  detailsFrom="search"
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

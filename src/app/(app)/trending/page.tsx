import { redirect } from "next/navigation";
import { RefreshButton } from "@/components/trending/RefreshButton";
import { TrendingCard } from "@/components/trending/TrendingCard";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { ownedTrendingKeys, trendingItemKey } from "@/lib/trending/ownership";
import { fetchTrendingFeed } from "@/lib/trending/feed";

/**
 * Trending page (DL-59): the full multi-source feed grouped by source. Each
 * source reflects its status — healthy sources render cards, unconfigured/error
 * sources show an accessible notice — so one provider failing never breaks the
 * page. Authenticated via the platform's route gating.
 */
export default async function TrendingPage(): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = getDb();
  const [feed, entries, media] = await Promise.all([
    fetchTrendingFeed({ limit: 24 }),
    listEntriesForUser(db, user.id),
    listMedia(db),
  ]);
  const owned = ownedTrendingKeys(entries, media);

  const anyItems = feed.sources.some((s) => s.items.length > 0);
  const allUnavailable =
    feed.sources.length > 0 && feed.sources.every((s) => s.status !== "ok" || s.items.length === 0);

  return (
    <section aria-labelledby="trending-title" className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 id="trending-title" className="text-2xl font-medium">
            Trending
          </h1>
          <p className="text-muted-foreground">Popular right now across sources.</p>
        </div>
        <RefreshButton />
      </div>

      {!anyItems && allUnavailable ? (
        <p className="py-4 text-muted-foreground" role="status">
          Trending is temporarily unavailable. Please try again.
        </p>
      ) : null}

      {feed.sources.map((source) => (
        <section key={source.source} aria-labelledby={`trending-${source.source}`} className="flex flex-col gap-3">
          <h2 id={`trending-${source.source}`} className="text-lg font-medium">
            {source.label}
          </h2>
          {source.status === "ok" && source.items.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {source.items.map((item) => (
                <li key={`${item.source}-${item.externalId ?? item.title}`}>
                  <TrendingCard item={item} alreadyInLibrary={owned.has(trendingItemKey(item))} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground" role="status">
              {source.status === "unconfigured"
                ? "This source isn’t configured yet."
                : source.status === "error"
                  ? "Couldn’t load this source right now."
                  : "Nothing trending here at the moment."}
            </p>
          )}
        </section>
      ))}
    </section>
  );
}

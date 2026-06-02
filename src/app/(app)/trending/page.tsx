import { redirect } from "next/navigation";
import { MediaTypeFilter } from "@/components/media/MediaTypeFilter";
import { RefreshButton } from "@/components/trending/RefreshButton";
import { TrendingCard } from "@/components/trending/TrendingCard";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { typeFilterHrefFactory } from "@/lib/media-type";
import { firstParam } from "@/lib/search-params";
import { ownedTrendingKeys, trendingItemKey } from "@/lib/trending/ownership";
import { fetchTrendingFeed } from "@/lib/trending/feed";
import { buildTrendingView } from "@/lib/trending/view";

/**
 * Trending page (DL-59): the full multi-source feed grouped by source. Each
 * source reflects its status — healthy sources render cards, unconfigured/error
 * sources show an accessible notice — so one provider failing never breaks the
 * page. A media-type filter (DL-73) narrows the already-fetched feed in memory;
 * the feed is still fetched once, so filtering never re-queries sources.
 * Authenticated via the platform's route gating.
 */
export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { type } = await searchParams;
  const db = getDb();
  const [feed, entries, media] = await Promise.all([
    fetchTrendingFeed({ limit: 24 }),
    listEntriesForUser(db, user.id),
    listMedia(db),
  ]);
  const owned = ownedTrendingKeys(entries, media);
  const view = buildTrendingView(feed, firstParam(type));
  const hrefFor = typeFilterHrefFactory({ basePath: "/trending" });

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

      {view.hasItems ? (
        <MediaTypeFilter
          options={view.options}
          activeValue={view.activeType}
          hrefFor={hrefFor}
          ariaLabel="Filter trending by media type"
        />
      ) : (
        <p className="py-4 text-muted-foreground" role="status">
          Trending is temporarily unavailable. Please try again.
        </p>
      )}

      {view.sources.map((source) => (
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
          ) : view.showStatusNotices ? (
            <p className="text-sm text-muted-foreground" role="status">
              {source.status === "unconfigured"
                ? "This source isn’t configured yet."
                : source.status === "error"
                  ? "Couldn’t load this source right now."
                  : "Nothing trending here at the moment."}
            </p>
          ) : null}
        </section>
      ))}
    </section>
  );
}

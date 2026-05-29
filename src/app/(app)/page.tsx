import { Feed } from "@/components/home/Feed";
import { FeedFilter } from "@/components/home/FeedFilter";
import { Hero } from "@/components/home/Hero";
import { StatsPanel } from "@/components/home/StatsPanel";
import { getDb } from "@/db/client";
import { listFeed, listMedia } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { mockHomeStats } from "@/lib/home-stats";
import { distinctMediaTypes, mediaTypeOptions, resolveActiveType } from "@/lib/media-type";

/**
 * Home (DL-29/30/31). The default signed-in landing page: hero, mock stats
 * panel, and the community feed with a data-derived media-type filter. Feed and
 * filter options are read server-side via the data-access layer; the selected
 * filter is carried in the `?type=` query so it survives refresh.
 *
 * These regions live only here (Req 7.5).
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}): Promise<React.JSX.Element> {
  const { type } = await searchParams;
  const db = getDb();
  const [user, media] = await Promise.all([getSessionUser(), listMedia(db)]);

  const options = mediaTypeOptions(distinctMediaTypes(media));
  const activeType = resolveActiveType(type, options);
  const feed = await listFeed(db, activeType === "all" ? {} : { type: activeType });

  return (
    <>
      <Hero userName={user?.name ?? "reader"} />
      <StatsPanel stats={mockHomeStats()} />
      <section aria-labelledby="feed-title">
        <h2 id="feed-title">Community feed</h2>
        <FeedFilter options={options} activeValue={activeType} />
        <Feed entries={feed} />
      </section>
    </>
  );
}

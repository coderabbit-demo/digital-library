import { redirect } from "next/navigation";
import { Feed } from "@/components/home/Feed";
import { FeedFilter } from "@/components/home/FeedFilter";
import { TrendingSection } from "@/components/trending/TrendingSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { listEntriesForUser, listFeed, listMedia } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import {
  distinctMediaTypes,
  mediaTypeOptions,
  resolveActiveType,
  typeFilterHrefFactory,
} from "@/lib/media-type";
import { firstParam } from "@/lib/search-params";
import { ownedTrendingKeys } from "@/lib/trending/ownership";

/**
 * Home dashboard: a welcoming hero alongside the community feed, with the
 * Trending Now section below. The feed and its media-type filter are read
 * server-side; the feed (`?type=`) and Trending (`?trending=`) filters are
 * independent and each preserves the other's selection on this shared route.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[]; trending?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { type, trending } = await searchParams;
  const trendingType = firstParam(trending);
  const db = getDb();

  const [media, entries] = await Promise.all([listMedia(db), listEntriesForUser(db, user.id)]);

  const options = mediaTypeOptions(distinctMediaTypes(media));
  const activeType = resolveActiveType(firstParam(type), options);
  const feed = await listFeed(db, activeType === "all" ? {} : { type: activeType });
  const ownedTrending = ownedTrendingKeys(entries, media);
  const feedHrefFor = typeFilterHrefFactory({
    basePath: "/",
    param: "type",
    preserve: { trending: trendingType },
  });
  const trendingHrefFor = typeFilterHrefFactory({
    basePath: "/",
    param: "trending",
    preserve: { type: activeType },
  });

  return (
    <>
      {/* Hero + feed row. On lg the grid row height is set by the image (the feed
          cell holds an absolutely-positioned card that fills it), so the feed
          matches the image height and its list scrolls. Stacks on mobile. */}
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- local static asset in /public; the project standardizes on <img> and skips next/image */}
        <img
          src="/CommuterReader.png"
          alt="A reader enjoying a book on their commute"
          className="h-auto w-full self-start rounded-xl border border-border object-cover"
        />
        <div className="relative min-h-0">
          <Card className="flex flex-col overflow-hidden lg:absolute lg:inset-0">
            <CardHeader>
              <CardTitle id="feed-title">Community feed</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col">
              <FeedFilter options={options} activeValue={activeType} hrefFor={feedHrefFor} />
              <div className="min-h-0 flex-1 overflow-y-auto">
                <Feed entries={feed} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <TrendingSection owned={ownedTrending} activeType={trendingType ?? "all"} hrefFor={trendingHrefFor} />
    </>
  );
}

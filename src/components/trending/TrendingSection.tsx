import Link from "next/link";
import { MediaTypeFilter } from "@/components/media/MediaTypeFilter";
import { TrendingCard } from "@/components/trending/TrendingCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { typeFilterHrefFactory } from "@/lib/media-type";
import { fetchTrendingFeed } from "@/lib/trending/feed";
import { trendingItemKey } from "@/lib/trending/ownership";
import { buildTrendingSectionView } from "@/lib/trending/view";

const PER_SOURCE = 4;
const TOTAL = 8;

export interface TrendingSectionProps {
  /** Keys of items already in the user's library, to reflect ownership. */
  owned: Set<string>;
  /** Raw `?trending=` selection; resolved against the section's own options. */
  activeType: string;
  /** Link builder for the filter pills; preserves the feed's selection (DL-73). */
  hrefFor: (value: string) => string;
}

/**
 * Compact "Trending Now" section for the Home dashboard (DL-60; filterable in
 * DL-73). Shows a small cross-source selection with a media-type filter and the
 * add control; hidden when nothing is available (the dedicated /trending page
 * surfaces per-source status). The filter narrows the preview in place, stays
 * independent of the community feed's filter (distinct query param), and the
 * "See all" link carries the active selection into /trending. `owned` marks
 * items already in the user's library.
 */
export async function TrendingSection({
  owned,
  activeType,
  hrefFor,
}: TrendingSectionProps): Promise<React.JSX.Element | null> {
  const feed = await fetchTrendingFeed({ limit: PER_SOURCE });
  const view = buildTrendingSectionView(feed, activeType, TOTAL);

  // Hidden only when there is nothing trending at all; data-driven options mean
  // a selected type always has at least one matching item.
  if ((view.options[0]?.count ?? 0) === 0) return null;

  const seeAllHref = typeFilterHrefFactory({ basePath: "/trending" })(view.activeType);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Trending Now</CardTitle>
        <Link
          href={seeAllHref}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          See all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <MediaTypeFilter
          options={view.options}
          activeValue={view.activeType}
          hrefFor={hrefFor}
          ariaLabel="Filter trending by media type"
        />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {view.items.map((item) => (
            <li key={`${item.source}-${item.externalId ?? item.title}`}>
              <TrendingCard
                item={item}
                alreadyInLibrary={owned.has(trendingItemKey(item))}
                detailsFrom="home"
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

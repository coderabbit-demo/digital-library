import Link from "next/link";
import { TrendingCard } from "@/components/trending/TrendingCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchTrendingFeed } from "@/lib/trending/feed";
import { trendingItemKey } from "@/lib/trending/ownership";
import type { TrendingItem } from "@/lib/types";

const PER_SOURCE = 4;
const TOTAL = 8;

/**
 * Compact "Trending Now" section for the Home dashboard (DL-60). Shows a small
 * cross-source selection with the add control; hidden when nothing is available
 * (the dedicated /trending page surfaces per-source status). `owned` marks
 * items already in the user's library.
 */
export async function TrendingSection({ owned }: { owned: Set<string> }): Promise<React.JSX.Element | null> {
  const feed = await fetchTrendingFeed({ limit: PER_SOURCE });
  const items: TrendingItem[] = feed.sources
    .filter((s) => s.status === "ok")
    .flatMap((s) => s.items)
    .slice(0, TOTAL);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Trending Now</CardTitle>
        <Link
          href="/trending"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          See all
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={`${item.source}-${item.externalId ?? item.title}`}>
              <TrendingCard item={item} alreadyInLibrary={owned.has(trendingItemKey(item))} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * View-model for the Trending page's media-type filter (media-type-filters
 * DL-73). Keeps the server component thin: it derives the filter options from
 * the feed, resolves the active selection, and narrows the feed — all from the
 * already-tested primitives. Options are data-driven (Req 1.2, 1.7), so a
 * selected type always has matching items; the only empty case is "no items at
 * all", surfaced via `hasItems`.
 */
import { countMediaTypes, resolveActiveType, type MediaTypeCount } from "@/lib/media-type";
import type { TrendingResponse, TrendingSourceResult } from "@/lib/types";
import { filterTrendingFeed } from "./filter";

export interface TrendingView {
  /** "All" + one option per present media type, with counts. */
  options: MediaTypeCount[];
  /** Resolved active selection; "all" by default and for unknown/absent values. */
  activeType: string;
  /** Source groups to render: every group for "all", only matching groups otherwise. */
  sources: TrendingSourceResult[];
  /** Source status notices belong to the "all" view only (Req 2.2). */
  showStatusNotices: boolean;
  /** Whether the feed has any items at all (the all-view empty signal). */
  hasItems: boolean;
}

export function buildTrendingView(
  feed: TrendingResponse,
  rawType: string | undefined,
): TrendingView {
  const okTypes = feed.sources
    .filter((source) => source.status === "ok")
    .flatMap((source) => source.items.map((item) => item.mediaType));
  const options = countMediaTypes(okTypes);
  const activeType = resolveActiveType(rawType, options);
  return {
    options,
    activeType,
    sources: filterTrendingFeed(feed, activeType).sources,
    showStatusNotices: activeType === "all",
    hasItems: okTypes.length > 0,
  };
}

/**
 * Shared contract for the Trending Now feature (trending-now DL-53).
 *
 * Every external source (NYT books, Spotify music, …) is normalized into a
 * single `TrendingItem` shape so the feed and UI render any provider without
 * per-source branching. The endpoint returns a per-source envelope carrying a
 * status so one provider's failure never sinks the others (graceful
 * degradation). These are transient DTOs — nothing here is persisted until a
 * user adds an item, which reuses the existing media/library path.
 */
import type { LibraryEntry, LibraryStatus, MediaItemMetadata } from "./domain";

/** Media types served by a provider; open to more as providers are added. */
export type TrendingMediaType = "ebook" | "music" | "podcast" | "movie" | "tv";

/** One normalized trending entry from any provider. */
export interface TrendingItem {
  /** Provider id, e.g. "nyt", "spotify". */
  source: string;
  /** Human-readable source, e.g. "NYT Best Sellers". */
  sourceLabel: string;
  mediaType: TrendingMediaType;
  title: string;
  /** Author / artist(s). */
  creator: string;
  /** The list/section it came from, e.g. "Hardcover Fiction", "New Releases". */
  listLabel: string;
  /** Position within its list when applicable; null otherwise. */
  rank: number | null;
  genre: string | null;
  /** Cover/art URL; only ever an https URL (validated by the provider). */
  artworkUrl: string | null;
  externalUrl: string | null;
  /** Stable upstream id (ISBN / Spotify id) for de-duplication. */
  externalId: string | null;
}

export type TrendingSourceStatus = "ok" | "unconfigured" | "error";

/** A provider's contribution to the feed, with its health for this request. */
export interface TrendingSourceResult {
  source: string;
  mediaType: TrendingMediaType;
  label: string;
  status: TrendingSourceStatus;
  items: TrendingItem[];
}

export interface TrendingResponse {
  sources: TrendingSourceResult[];
}

/** Request to add a trending item to the signed-in user's library. */
export interface AddTrendingRequest {
  type: string;
  title: string;
  creator: string;
  genre?: string;
  /** Defaults to "wishlist" when omitted. */
  status?: LibraryStatus;
  metadata?: MediaItemMetadata | null;
  coverTheme?: string;
}

export interface AddTrendingResponse {
  entry: LibraryEntry;
  /** True when a new media item was created (vs. matched to an existing one). */
  created: boolean;
  /** True when the user already had a library entry for the matched item. */
  alreadyOwned: boolean;
}

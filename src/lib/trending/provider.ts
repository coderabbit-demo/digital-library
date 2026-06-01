/**
 * Trending provider abstraction (trending-now DL-53).
 *
 * Each external source implements this port — declaring its media type and
 * label, a configuration check (so an unconfigured source degrades rather than
 * errors), and a fetch that returns normalized `TrendingItem`s. `fetchImpl` is
 * injectable so providers are tested against mocked upstream responses (no live
 * calls). Concrete providers are registered in `registry.ts` as they are added
 * (DL-54 NYT books, DL-55 Spotify music); the fan-out endpoint (DL-56) iterates
 * the registry and isolates each provider's failure.
 */
import type { TrendingItem, TrendingMediaType } from "@/lib/types";

export interface TrendingFetchOptions {
  /** Max items to return for this source. */
  limit: number;
  /** Injectable fetch for testing; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

export interface TrendingProvider {
  readonly id: string;
  readonly label: string;
  readonly mediaType: TrendingMediaType;
  /** True when the provider's credentials are present in the environment. */
  isConfigured(env: Record<string, string | undefined>): boolean;
  /** Fetch + normalize this source's trending items. May throw; the caller isolates it. */
  fetchTrending(opts: TrendingFetchOptions): Promise<TrendingItem[]>;
}

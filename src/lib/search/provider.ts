/**
 * Search provider abstraction (media-search DL-82).
 *
 * Mirrors the trending provider port, but each source performs a query-based
 * search and normalizes results into the shared `TrendingItem` shape so the
 * search fan-out and UI render any source without per-source branching.
 * `fetchImpl` is injectable so providers are tested against mocked responses.
 */
import type { TrendingItem, TrendingMediaType } from "@/lib/types";

export interface SearchFetchOptions {
  /** Max results to return for this source. */
  limit: number;
  /** Injectable fetch for testing; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** The same env used for `isConfigured`, so credential reads stay consistent. */
  env?: Record<string, string | undefined>;
}

export interface SearchProvider {
  readonly id: string;
  readonly label: string;
  readonly mediaType: TrendingMediaType;
  /** True when the provider's credentials are present in the environment. */
  isConfigured(env: Record<string, string | undefined>): boolean;
  /** Search + normalize this source's results. May throw; the caller isolates it. */
  search(query: string, opts: SearchFetchOptions): Promise<TrendingItem[]>;
}

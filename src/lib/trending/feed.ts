/**
 * Trending fan-out (trending-now DL-56).
 *
 * Runs the configured providers concurrently and isolates each one: an
 * unconfigured provider yields `unconfigured`, a throwing/rate-limited provider
 * yields `error`, and the rest still return `ok` — so one source's failure
 * never sinks the feed (graceful per-provider degradation). Provider list, env,
 * and fetch are injectable so the fan-out is testable without live calls.
 */
import type { TrendingResponse, TrendingSourceResult } from "@/lib/types";
import type { TrendingProvider } from "./provider";
import { TRENDING_PROVIDERS } from "./registry";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

export interface TrendingFeedOptions {
  /** Items per source (clamped 1..50); defaults to a compact 12. */
  limit?: number;
  /** Restrict to a single provider id. */
  source?: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  providers?: readonly TrendingProvider[];
}

export async function fetchTrendingFeed(opts: TrendingFeedOptions = {}): Promise<TrendingResponse> {
  const env = opts.env ?? process.env;
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const providers = (opts.providers ?? TRENDING_PROVIDERS).filter(
    (p) => !opts.source || p.id === opts.source,
  );

  const sources = await Promise.all(
    providers.map(async (provider): Promise<TrendingSourceResult> => {
      const base = { source: provider.id, mediaType: provider.mediaType, label: provider.label };
      if (!provider.isConfigured(env)) return { ...base, status: "unconfigured", items: [] };
      try {
        const items = await provider.fetchTrending({ limit, fetchImpl: opts.fetchImpl });
        return { ...base, status: "ok", items };
      } catch (error) {
        console.error(`trending provider "${provider.id}" failed:`, error);
        return { ...base, status: "error", items: [] };
      }
    }),
  );

  return { sources };
}

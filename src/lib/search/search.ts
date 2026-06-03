/**
 * Search fan-out (media-search DL-82).
 *
 * Runs the configured search providers concurrently for a query and isolates
 * each — unconfigured → `unconfigured`, throwing → `error`, else `ok` — so one
 * source never sinks the others (graceful per-source degradation), reusing the
 * trending response envelope. An empty/whitespace query makes no upstream calls.
 * Provider list, env, and fetch are injectable so the fan-out is testable.
 */
import type { TrendingResponse, TrendingSourceResult } from "@/lib/types";
import type { SearchProvider } from "./provider";
import { SEARCH_PROVIDERS } from "./registry";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 25;

export interface SearchFeedOptions {
  query: string;
  limit?: number;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  providers?: readonly SearchProvider[];
}

export async function searchMedia(opts: SearchFeedOptions): Promise<TrendingResponse> {
  const query = opts.query.trim();
  if (!query) return { sources: [] };

  const env = opts.env ?? process.env;
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const providers = opts.providers ?? SEARCH_PROVIDERS;

  const sources = await Promise.all(
    providers.map(async (provider): Promise<TrendingSourceResult> => {
      const base = { source: provider.id, mediaType: provider.mediaType, label: provider.label };
      if (!provider.isConfigured(env)) return { ...base, status: "unconfigured", items: [] };
      try {
        const items = await provider.search(query, { limit, fetchImpl: opts.fetchImpl, env });
        return { ...base, status: "ok", items };
      } catch (error) {
        console.error(`search provider "${provider.id}" failed:`, error);
        return { ...base, status: "error", items: [] };
      }
    }),
  );

  return { sources };
}

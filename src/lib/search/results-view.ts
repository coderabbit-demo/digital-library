/**
 * Search results view helpers (media-search): apply the user-selected media-type
 * filter to the per-source search feed. Pure so the page stays thin and the
 * filtering is unit-testable without a database or network.
 */
import type { TrendingSourceResult } from "@/lib/types";

/** Sources that actually returned results — the basis for both the type-filter
 *  options and the rendered groups. */
export function okResultSources(sources: readonly TrendingSourceResult[]): TrendingSourceResult[] {
  return sources.filter((s) => s.status === "ok" && s.items.length > 0);
}

/**
 * Filter each source's items to the active media type, dropping any source left
 * empty. "all" passes everything through. Data-driven: no per-type branching, so
 * new media types filter automatically.
 */
export function filterResultSourcesByType(
  sources: readonly TrendingSourceResult[],
  activeType: string,
): TrendingSourceResult[] {
  if (activeType === "all") return sources.map((s) => ({ ...s }));
  return sources
    .map((s) => ({ ...s, items: s.items.filter((item) => item.mediaType === activeType) }))
    .filter((s) => s.items.length > 0);
}

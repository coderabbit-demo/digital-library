/**
 * Shared contracts for media enrichment providers (media-detail-enrichment).
 *
 * Each provider re-queries an external source by title/creator and normalizes
 * the response into a typed partial for one media kind. Providers never throw —
 * any failure (unconfigured/timeout/error/no data) maps to an empty partial —
 * and they reuse the keyless cover HTTP helper for time-bounded fetches.
 */
import type { MediaEnrichment } from "@/lib/types";
import type { CoverDeps } from "@/lib/covers/http";

/** Enrichment shape for a specific media kind. */
export type EnrichmentOf<K extends MediaEnrichment["kind"]> = Extract<MediaEnrichment, { kind: K }>;

export interface EnrichmentFetchDeps {
  /** Injectable fetch for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Per-request timeout; defaults to 5s. */
  timeoutMs?: number;
  /** Credential source; same object used by `isConfigured`, defaults to process.env. */
  env?: Record<string, string | undefined>;
}

export const DEFAULT_ENRICHMENT_TIMEOUT_MS = 5000;
/** Cap on list-valued fields (cast, genres, categories) to keep the page bounded. */
export const ENRICHMENT_LIST_CAP = 8;

/** Forward the fetch-related deps to the cover HTTP helper. */
export function coverDeps(deps: EnrichmentFetchDeps): CoverDeps {
  return { fetchImpl: deps.fetchImpl, timeoutMs: deps.timeoutMs ?? DEFAULT_ENRICHMENT_TIMEOUT_MS };
}

export function enrichmentEnv(deps: EnrichmentFetchDeps): Record<string, string | undefined> {
  return deps.env ?? process.env;
}

/**
 * Drop `undefined` values from a kind partial and return `null` when nothing
 * beyond `kind` remains, so callers can treat "no data" uniformly.
 */
export function compactEnrichment<K extends MediaEnrichment["kind"]>(
  kind: K,
  fields: Partial<Omit<EnrichmentOf<K>, "kind">>,
): EnrichmentOf<K> | null {
  const out: Record<string, unknown> = { kind };
  let has = false;
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
    has = true;
  }
  return has ? (out as EnrichmentOf<K>) : null;
}

/** Trimmed non-empty string, else undefined. */
export function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Non-negative integer, else undefined. */
export function nonNegInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** Finite number clamped to [min, max], else undefined (for scores). */
export function numberInRange(value: unknown, min: number, max: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : undefined;
}

/** De-duplicated, capped list of trimmed non-empty strings; undefined if empty. */
export function textList(values: readonly unknown[] | undefined, cap = ENRICHMENT_LIST_CAP): string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const out: string[] = [];
  for (const v of values) {
    const t = text(v);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= cap) break;
  }
  return out.length > 0 ? out : undefined;
}

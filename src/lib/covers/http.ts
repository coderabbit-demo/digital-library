/**
 * Shared HTTP helpers for keyless cover lookups (cover-art DL-75).
 *
 * Mirrors the trending clients: a time-bounded fetch that never throws to the
 * caller (errors/timeouts → null) and an https-only URL guard, so cover
 * resolution always degrades gracefully (Req 4.6, 7.1) and only https image
 * URLs are ever returned (Req 5.3).
 */
export interface CoverDeps {
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Per-request timeout; defaults to 4s (on-demand path). */
  timeoutMs?: number;
}

export function httpsOrNull(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** GET a URL and parse JSON; returns null on timeout, network error, or non-2xx. */
export async function fetchJson(
  url: string,
  deps: CoverDeps,
  headers?: Record<string, string>,
): Promise<unknown | null> {
  const doFetch = deps.fetchImpl ?? fetch;
  try {
    const res = await doFetch(url, { signal: AbortSignal.timeout(deps.timeoutMs ?? 4000), headers });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

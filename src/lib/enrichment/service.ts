/**
 * Resolve-and-persist a media item's enrichment (media-detail-enrichment Req
 * 2.2, 2.3, 3.2). Mirrors the cover resolve-and-persist service.
 *
 * Idempotent: an item already enriched or already checked is returned unchanged,
 * so the external lookup is never repeated. A resolved enrichment (or a
 * definitive "none found") stamps the checked time; provider failures surface as
 * a null enrichment, never an exception (Req 7.3).
 */
import type { DbExecutor } from "@/db/client";
import { findMediaById, updateMediaEnrichment } from "@/db/queries";
import type { MediaEnrichment } from "@/lib/types";
import { enrichItem } from "./dispatch";
import type { EnrichmentFetchDeps } from "./provider";

export type EnrichmentOutcome =
  | { status: "not_found" }
  | { status: "cached" | "resolved"; enrichment: MediaEnrichment | null };

export interface ResolveAndPersistEnrichmentDeps {
  /** Override the resolver (tests / injected deps); defaults to enrichItem. */
  enrich?: (item: { type: string; title: string; creator: string }, deps?: EnrichmentFetchDeps) => Promise<MediaEnrichment | null>;
  /** Timestamp to stamp; defaults to now. */
  now?: Date;
  /** Forwarded to the default resolver (timeout, fetch impl, env). */
  fetchDeps?: EnrichmentFetchDeps;
}

export async function resolveAndPersistEnrichment(
  db: DbExecutor,
  mediaItemId: string,
  deps: ResolveAndPersistEnrichmentDeps = {},
): Promise<EnrichmentOutcome> {
  const item = await findMediaById(db, mediaItemId);
  if (!item) return { status: "not_found" };

  // Already attempted — no external call (idempotent), even when it found nothing.
  if (item.enrichmentCheckedAt) {
    return { status: "cached", enrichment: item.enrichment ?? null };
  }

  const checkedAt = deps.now ?? new Date();
  const enrich = deps.enrich ?? ((i, d) => enrichItem(i, d));
  const enrichment = await enrich(
    { type: item.type, title: item.title, creator: item.creator },
    deps.fetchDeps,
  );
  await updateMediaEnrichment(db, item.id, enrichment, checkedAt);
  return { status: "resolved", enrichment };
}

/**
 * Integration tests (media-detail-enrichment Req 2.2, 2.3) for the
 * resolve-and-persist enrichment service that backs POST /api/enrichment —
 * against pglite with the committed migration applied.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findMediaById, findOrCreateMedia } from "@/db/queries";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import type { MediaCreateInput } from "@/db/queries";
import type { MediaEnrichment } from "@/lib/types";
import { resolveAndPersistEnrichment } from "./service";

let db: Db;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createTestDb());
});
afterEach(async () => {
  await close();
});

function media(over: Partial<MediaCreateInput> = {}): MediaCreateInput {
  return {
    type: "tv_movie",
    title: "The Matrix",
    creator: "",
    genre: "Sci-Fi",
    language: "English",
    description: "",
    coverTheme: "teal",
    artworkUrl: null,
    metadata: null,
    totalUnits: null,
    ...over,
  };
}

const at = new Date("2026-06-03T19:00:00Z");
const resolved: MediaEnrichment = { kind: "video", tmdbId: 603, runtimeMinutes: 136, voteAverage: 8.2 };

describe("resolveAndPersistEnrichment (media-detail-enrichment)", () => {
  it("resolves and persists enrichment for an unchecked item", async () => {
    const { media: item } = await findOrCreateMedia(db, media());
    const enrich = vi.fn(async () => resolved);

    const outcome = await resolveAndPersistEnrichment(db, item.id, { enrich, now: at });

    expect(outcome).toEqual({ status: "resolved", enrichment: resolved });
    const reloaded = await findMediaById(db, item.id);
    expect(reloaded?.enrichment).toEqual(resolved);
    expect(reloaded?.enrichmentCheckedAt).toBe(at.toISOString());
    expect(enrich).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: a checked item returns cached enrichment without re-resolving", async () => {
    const { media: item } = await findOrCreateMedia(db, media());
    const enrich = vi.fn(async () => resolved);
    await resolveAndPersistEnrichment(db, item.id, { enrich, now: at });

    const second = await resolveAndPersistEnrichment(db, item.id, {
      enrich,
      now: new Date("2026-06-04T00:00:00Z"),
    });
    expect(second).toEqual({ status: "cached", enrichment: resolved });
    expect(enrich).toHaveBeenCalledTimes(1); // not called again
  });

  it("stamps the checked time even when no data is found, so it is not retried", async () => {
    const { media: item } = await findOrCreateMedia(db, media({ title: "Obscure", creator: "Nobody" }));
    const enrich = vi.fn(async () => null);

    const outcome = await resolveAndPersistEnrichment(db, item.id, { enrich, now: at });
    expect(outcome).toEqual({ status: "resolved", enrichment: null });
    const reloaded = await findMediaById(db, item.id);
    expect(reloaded?.enrichment).toBeNull();
    expect(reloaded?.enrichmentCheckedAt).toBe(at.toISOString());

    const second = await resolveAndPersistEnrichment(db, item.id, { enrich, now: at });
    expect(second.status).toBe("cached");
    expect(enrich).toHaveBeenCalledTimes(1); // null result still cached
  });

  it("returns not_found for an unknown id", async () => {
    const outcome = await resolveAndPersistEnrichment(db, "00000000-0000-4000-8000-000000000000", {
      enrich: vi.fn(),
    });
    expect(outcome).toEqual({ status: "not_found" });
  });
});

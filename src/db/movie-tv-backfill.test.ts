/**
 * Integration test (movie-tv-types DL-89, Req 4) for the backfill that
 * reclassifies legacy combined `tv_movie` rows into `movie`/`tv`. The committed
 * migration runs at bootstrap on an empty table (a no-op), so this test inserts
 * `tv_movie` rows with various hints, re-runs the same backfill statement, and
 * asserts the mapping and that related user data is preserved (Req 4.5).
 */
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerMember } from "@/lib/auth/service";
import { libraryEntries } from "@/db/schema";
import {
  findMediaById,
  insertMediaItem,
  listTagsByEntryIds,
  saveReview,
  setEntryTags,
  updateMediaEnrichment,
  upsertEntryStatus,
} from "@/db/queries";
import type { Db } from "./client";
import type { MediaEnrichment } from "@/lib/types";
import { createTestDb } from "./test-db";

let db: Db;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createTestDb());
});
afterEach(async () => {
  await close();
});

// The same statement the 0007 migration applies.
const BACKFILL = sql`
  UPDATE "media_items" SET "type" = CASE
    WHEN "enrichment"->>'tmdbType' = 'tv'     THEN 'tv'
    WHEN "enrichment"->>'tmdbType' = 'movie'  THEN 'movie'
    WHEN "enrichment"->>'seasons' IS NOT NULL THEN 'tv'
    WHEN "metadata"->>'seasons' IS NOT NULL   THEN 'tv'
    ELSE 'movie'
  END
  WHERE "type" = 'tv_movie';
`;

let seq = 0;
async function legacyItem(
  over: { metadata?: { kind: "video"; seasons?: number; runtimeMinutes?: number } } = {},
) {
  seq += 1;
  return insertMediaItem(db, {
    type: "tv_movie",
    title: `Legacy ${seq}`,
    creator: "",
    genre: "Drama",
    language: "English",
    description: "",
    coverTheme: "teal",
    metadata: over.metadata ?? null,
    totalUnits: null,
  });
}

const at = new Date("2026-06-04T00:00:00Z");

describe("movie/tv backfill (DL-89)", () => {
  it("classifies by tmdbType, then a seasons hint, then defaults to movie", async () => {
    const byTmdbTv = await legacyItem();
    await updateMediaEnrichment(db, byTmdbTv.id, { kind: "video", tmdbType: "tv" } as MediaEnrichment, at);
    const byTmdbMovie = await legacyItem();
    await updateMediaEnrichment(db, byTmdbMovie.id, { kind: "video", tmdbType: "movie" } as MediaEnrichment, at);
    const byEnrichmentSeasons = await legacyItem();
    await updateMediaEnrichment(db, byEnrichmentSeasons.id, { kind: "video", seasons: 3 } as MediaEnrichment, at);
    const byMetadataSeasons = await legacyItem({ metadata: { kind: "video", seasons: 2 } });
    const defaulted = await legacyItem();

    await db.execute(BACKFILL);

    expect((await findMediaById(db, byTmdbTv.id))?.type).toBe("tv");
    expect((await findMediaById(db, byTmdbMovie.id))?.type).toBe("movie");
    expect((await findMediaById(db, byEnrichmentSeasons.id))?.type).toBe("tv");
    expect((await findMediaById(db, byMetadataSeasons.id))?.type).toBe("tv");
    expect((await findMediaById(db, defaulted.id))?.type).toBe("movie");
  });

  it("is a no-op on re-run and preserves library entries, reviews, and tags", async () => {
    const r = await registerMember(db, { name: "Ava", email: "ava@example.com", password: "readmore" });
    if (!r.ok) throw new Error(r.error);
    const show = await legacyItem({ metadata: { kind: "video", seasons: 1 } });
    const entry = await upsertEntryStatus(db, { userId: r.user.id, mediaItemId: show.id, status: "finished", updatedAt: at });
    await saveReview(db, { entryId: entry.id, userId: r.user.id, rating: 5, review: "Loved it", updatedAt: at });
    await setEntryTags(db, { entryId: entry.id, userId: r.user.id, tags: ["sci-fi"] });

    await db.execute(BACKFILL);
    await db.execute(BACKFILL); // second run changes nothing

    const reclassified = await findMediaById(db, show.id);
    expect(reclassified?.type).toBe("tv");
    // The entry (same media id), its review, and its tags survive untouched.
    expect((await listTagsByEntryIds(db, [entry.id])).get(entry.id)).toEqual(["sci-fi"]);
    const [row] = await db.select().from(libraryEntries).where(eq(libraryEntries.id, entry.id));
    expect(row).toMatchObject({ rating: 5, review: "Loved it", mediaItemId: show.id });
  });
});

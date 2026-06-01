/**
 * Integration tests (DL-64) for the atomic media de-dup, against pglite with the
 * unique index migration applied. find-or-create converges duplicates (incl.
 * case-insensitive and concurrent) onto a single catalog row.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findOrCreateMedia, listMedia } from "@/db/queries";
import type { Db } from "./client";
import type { MediaItem } from "@/lib/types";
import { createTestDb } from "./test-db";

let db: Db;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createTestDb());
});
afterEach(async () => {
  await close();
});

function media(over: Partial<Omit<MediaItem, "id">> = {}): Omit<MediaItem, "id"> {
  return {
    type: "ebook",
    title: "Circe",
    creator: "Madeline Miller",
    genre: "Fiction",
    language: "English",
    description: "",
    coverTheme: "gold",
    metadata: null,
    totalUnits: null,
    ...over,
  };
}

describe("findOrCreateMedia (DL-64)", () => {
  it("creates once, then reuses on a case-insensitive duplicate key", async () => {
    const first = await findOrCreateMedia(db, media());
    expect(first.created).toBe(true);

    const second = await findOrCreateMedia(db, media({ title: "circe", creator: "MADELINE MILLER" }));
    expect(second.created).toBe(false);
    expect(second.media.id).toBe(first.media.id);
    expect((await listMedia(db)).filter((m) => m.title === "Circe")).toHaveLength(1);
  });

  it("keeps distinct keys separate (type and creator matter)", async () => {
    await findOrCreateMedia(db, media({ title: "Dune", creator: "Frank Herbert" }));
    const other = await findOrCreateMedia(db, media({ title: "Dune", creator: "Denis Villeneuve", type: "tv_movie" }));
    expect(other.created).toBe(true);
    expect((await listMedia(db)).filter((m) => m.title === "Dune")).toHaveLength(2);
  });

  it("converges concurrent find-or-creates onto a single row", async () => {
    const input = media({ title: "Babel", creator: "R. F. Kuang" });
    const results = await Promise.all([
      findOrCreateMedia(db, input),
      findOrCreateMedia(db, input),
      findOrCreateMedia(db, input),
    ]);
    expect(new Set(results.map((r) => r.media.id)).size).toBe(1);
    expect((await listMedia(db)).filter((m) => m.title === "Babel")).toHaveLength(1);
  });
});

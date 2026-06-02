/**
 * Integration tests (cover-art DL-75) for the artwork DAL, against pglite with
 * the 0003 migration applied: persisting a resolved cover + checked marker,
 * selecting only items that still need a cover, and carrying provider artwork
 * through find-or-create.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findMediaById, findMediaNeedingCover, findOrCreateMedia, updateMediaArtwork } from "@/db/queries";
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

function media(over: Partial<Omit<MediaItem, "id">> = {}): Omit<MediaItem, "id" | "artworkCheckedAt"> {
  return {
    type: "ebook",
    title: "Circe",
    creator: "Madeline Miller",
    genre: "Fiction",
    language: "English",
    description: "",
    coverTheme: "gold",
    artworkUrl: null,
    metadata: null,
    totalUnits: null,
    ...over,
  };
}

describe("artwork DAL (cover-art DL-75)", () => {
  it("persists a resolved cover and its checked marker", async () => {
    const { media: created } = await findOrCreateMedia(db, media());
    expect(created.artworkUrl).toBeNull();
    expect(created.artworkCheckedAt).toBeNull();

    const at = new Date("2026-06-02T18:00:00Z");
    await updateMediaArtwork(db, created.id, "https://covers.example/c.jpg", at);

    const reloaded = await findMediaById(db, created.id);
    expect(reloaded?.artworkUrl).toBe("https://covers.example/c.jpg");
    expect(reloaded?.artworkCheckedAt).toBe(at.toISOString());
  });

  it("records a 'no cover found' outcome (checked, url stays null) so it is not retried", async () => {
    const { media: created } = await findOrCreateMedia(db, media({ title: "Obscure", creator: "Nobody" }));
    const at = new Date("2026-06-02T18:05:00Z");
    await updateMediaArtwork(db, created.id, null, at);

    const reloaded = await findMediaById(db, created.id);
    expect(reloaded?.artworkUrl).toBeNull();
    expect(reloaded?.artworkCheckedAt).toBe(at.toISOString());
  });

  it("find-or-create persists supplied provider artwork on a new row", async () => {
    const { media: created } = await findOrCreateMedia(
      db,
      media({ title: "Blue", creator: "Joni Mitchell", type: "music", artworkUrl: "https://art/blue.jpg" }),
    );
    expect(created.artworkUrl).toBe("https://art/blue.jpg");
  });

  it("findMediaNeedingCover returns only never-checked, art-less rows", async () => {
    const needs = await findOrCreateMedia(db, media({ title: "Needs", creator: "A" }));
    const hasArt = await findOrCreateMedia(db, media({ title: "HasArt", creator: "B", artworkUrl: "https://a/x.jpg" }));
    const checked = await findOrCreateMedia(db, media({ title: "Checked", creator: "C" }));
    await updateMediaArtwork(db, checked.media.id, null, new Date("2026-06-02T00:00:00Z"));

    const result = await findMediaNeedingCover(db, 50);
    const ids = result.map((m) => m.id);
    expect(ids).toContain(needs.media.id);
    expect(ids).not.toContain(hasArt.media.id);
    expect(ids).not.toContain(checked.media.id);
  });
});

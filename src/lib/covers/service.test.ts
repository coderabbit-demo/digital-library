/**
 * Integration tests (cover-art DL-75) for the resolve-and-persist service that
 * backs POST /api/cover and the backfill script — against pglite.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findMediaById, findOrCreateMedia } from "@/db/queries";
import type { Db } from "@/db/client";
import type { MediaItem } from "@/lib/types";
import { createTestDb } from "@/db/test-db";
import { resolveAndPersistCover } from "./service";

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

const at = new Date("2026-06-02T19:00:00Z");

describe("resolveAndPersistCover (cover-art DL-75)", () => {
  it("resolves and persists a cover for an art-less, unchecked, supported item", async () => {
    const { media: item } = await findOrCreateMedia(db, media());
    const resolve = vi.fn(async () => "https://covers/circe.jpg");

    const outcome = await resolveAndPersistCover(db, item.id, { resolve, now: at });

    expect(outcome).toEqual({ status: "resolved", artworkUrl: "https://covers/circe.jpg" });
    const reloaded = await findMediaById(db, item.id);
    expect(reloaded?.artworkUrl).toBe("https://covers/circe.jpg");
    expect(reloaded?.artworkCheckedAt).toBe(at.toISOString());
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: a checked item returns cached art without re-resolving", async () => {
    const { media: item } = await findOrCreateMedia(db, media());
    const resolve = vi.fn(async () => "https://covers/circe.jpg");
    await resolveAndPersistCover(db, item.id, { resolve, now: at });

    const second = await resolveAndPersistCover(db, item.id, { resolve, now: new Date("2026-06-03T00:00:00Z") });
    expect(second).toEqual({ status: "cached", artworkUrl: "https://covers/circe.jpg" });
    expect(resolve).toHaveBeenCalledTimes(1); // not called again
  });

  it("records a no-result outcome (null url, checked) so it is not retried", async () => {
    const { media: item } = await findOrCreateMedia(db, media({ title: "Obscure", creator: "Nobody" }));
    const resolve = vi.fn(async () => null);

    const outcome = await resolveAndPersistCover(db, item.id, { resolve, now: at });
    expect(outcome).toEqual({ status: "resolved", artworkUrl: null });
    const reloaded = await findMediaById(db, item.id);
    expect(reloaded?.artworkCheckedAt).toBe(at.toISOString());
  });

  it("marks an unsupported type checked without calling the resolver", async () => {
    const { media: item } = await findOrCreateMedia(db, media({ type: "boardgame", title: "Catan", creator: "Klaus" }));
    const resolve = vi.fn(async () => "https://x");

    const outcome = await resolveAndPersistCover(db, item.id, { resolve, now: at });
    expect(outcome).toEqual({ status: "unsupported", artworkUrl: null });
    expect(resolve).not.toHaveBeenCalled();
    expect((await findMediaById(db, item.id))?.artworkCheckedAt).toBe(at.toISOString());
  });

  it("returns not_found for an unknown id", async () => {
    const outcome = await resolveAndPersistCover(db, "00000000-0000-4000-8000-000000000000", { resolve: vi.fn() });
    expect(outcome).toEqual({ status: "not_found" });
  });
});

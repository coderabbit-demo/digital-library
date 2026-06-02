/**
 * Integration tests (DL-57) for adding a trending item, against pglite with the
 * committed migrations. Covers find-or-create de-dup, already-owned reporting,
 * activity recording, and per-user isolation.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerMember } from "@/lib/auth/service";
import { addTrendingItem, resolveTrendingMedia, type AddTrendingInput } from "./add";
import { findEntry, findMediaById, listEntriesForUser, listFeed, listMedia } from "@/db/queries";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";

let db: Db;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createTestDb());
});
afterEach(async () => {
  await close();
});

async function user(email: string) {
  const r = await registerMember(db, { name: email, email, password: "readmore" });
  if (!r.ok) throw new Error(r.error);
  return r.user;
}

const circe: AddTrendingInput = {
  type: "ebook",
  title: "Circe",
  creator: "Madeline Miller",
  genre: "Mythic Fiction",
  status: "wishlist",
  metadata: { kind: "ebook" },
};

const at = new Date("2026-06-01T00:00:00Z");

describe("addTrendingItem (DL-57)", () => {
  it("creates media + entry + activity on first add, then de-dups", async () => {
    const u = await user("a@example.com");

    const first = await db.transaction((tx) => addTrendingItem(tx, u.id, circe, at));
    expect(first.created).toBe(true);
    expect(first.alreadyOwned).toBe(false);
    expect((await listMedia(db)).filter((m) => m.title === "Circe")).toHaveLength(1);
    expect(await findEntry(db, u.id, first.entry.mediaItemId)).not.toBeNull();

    // Re-adding (different casing) matches the existing media — no duplicate.
    const second = await db.transaction((tx) =>
      addTrendingItem(tx, u.id, { ...circe, title: "circe", creator: "MADELINE MILLER" }, at),
    );
    expect(second.created).toBe(false);
    expect(second.alreadyOwned).toBe(true);
    expect((await listMedia(db)).filter((m) => m.title === "Circe")).toHaveLength(1);

    // Activity recorded → shows in the community feed.
    expect((await listFeed(db)).some((e) => e.itemTitle === "Circe")).toBe(true);
  });

  it("persists provider artwork on create and fills a missing cover without overwriting (cover-art Req 3)", async () => {
    const u = await user("a@example.com");

    // First add carries provider artwork → persisted on the new row.
    const first = await db.transaction((tx) =>
      addTrendingItem(tx, u.id, { ...circe, artworkUrl: "https://art/circe.jpg" }, at),
    );
    expect((await findMediaById(db, first.entry.mediaItemId))?.artworkUrl).toBe("https://art/circe.jpg");

    // A later add with different art must NOT overwrite the existing cover.
    await db.transaction((tx) =>
      addTrendingItem(tx, u.id, { ...circe, artworkUrl: "https://art/other.jpg" }, at),
    );
    expect((await findMediaById(db, first.entry.mediaItemId))?.artworkUrl).toBe("https://art/circe.jpg");
  });

  it("fills a missing cover on an existing art-less row from a later add", async () => {
    const u = await user("a@example.com");
    const first = await db.transaction((tx) => addTrendingItem(tx, u.id, circe, at)); // no artwork
    expect((await findMediaById(db, first.entry.mediaItemId))?.artworkUrl).toBeNull();

    await db.transaction((tx) => addTrendingItem(tx, u.id, { ...circe, artworkUrl: "https://art/late.jpg" }, at));
    expect((await findMediaById(db, first.entry.mediaItemId))?.artworkUrl).toBe("https://art/late.jpg");
  });

  it("scopes ownership per user (a second user's add is their own)", async () => {
    const a = await user("a@example.com");
    const b = await user("b@example.com");
    await db.transaction((tx) => addTrendingItem(tx, a.id, circe, at));

    const bAdd = await db.transaction((tx) => addTrendingItem(tx, b.id, circe, at));
    expect(bAdd.created).toBe(false); // media reused
    expect(bAdd.alreadyOwned).toBe(false); // but b had no entry
    expect(await findEntry(db, b.id, bAdd.entry.mediaItemId)).not.toBeNull();
  });
});

describe("resolveTrendingMedia (DL-67)", () => {
  const input = { type: "music", title: "Blue", creator: "Joni Mitchell", genre: "Folk", metadata: null };

  it("find-or-creates the media row without a library entry, and de-dups", async () => {
    const u = await user("a@example.com");

    const first = await db.transaction((tx) => resolveTrendingMedia(tx, input));
    expect(first.created).toBe(true);
    expect((await listMedia(db)).filter((m) => m.title === "Blue")).toHaveLength(1);
    // No library entry was created by resolving.
    expect(await listEntriesForUser(db, u.id)).toEqual([]);

    // Re-resolving (different casing) returns the same row — no duplicate.
    const second = await db.transaction((tx) =>
      resolveTrendingMedia(tx, { ...input, title: "blue", creator: "JONI MITCHELL" }),
    );
    expect(second.created).toBe(false);
    expect(second.id).toBe(first.id);
    expect((await listMedia(db)).filter((m) => m.title === "Blue")).toHaveLength(1);
  });
});

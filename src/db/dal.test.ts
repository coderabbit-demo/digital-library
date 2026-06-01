/**
 * DAL integration tests (DL-43) for the v2 data helpers, against pglite with
 * the committed migrations applied. Focuses on per-user scoping, idempotency,
 * and aggregation.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerMember } from "@/lib/auth/service";
import {
  countFinishedBetween,
  getActiveGoal,
  insertAchievementUnlocks,
  insertMediaItem,
  listTagsByEntryIds,
  listUserAchievements,
  setEntryTags,
  updateEntryProgress,
  upsertEntryStatus,
  upsertGoal,
} from "@/db/queries";
import type { Db } from "./client";
import { createTestDb } from "./test-db";

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

// Distinct title per call — media is unique by (type, lower(title), lower(creator)) (DL-64).
let mediaSeq = 0;

async function entryFor(
  userId: string,
  status: "wishlist" | "current" | "finished",
  updatedAt = new Date("2026-06-01T00:00:00Z"),
) {
  mediaSeq += 1;
  const media = await insertMediaItem(db, {
    type: "music",
    title: `Album ${mediaSeq}`,
    creator: "Joni Mitchell",
    genre: "Folk",
    language: "English",
    description: "",
    coverTheme: "navy",
    metadata: { kind: "music", album: `Album ${mediaSeq}` },
    totalUnits: null,
  });
  return upsertEntryStatus(db, { userId, mediaItemId: media.id, status, updatedAt });
}

describe("tags DAL (DL-43)", () => {
  it("replaces and aggregates tags, and refuses non-owned entries", async () => {
    const owner = await user("owner@example.com");
    const other = await user("other@example.com");
    const entry = await entryFor(owner.id, "current");

    const saved = await setEntryTags(db, { entryId: entry.id, userId: owner.id, tags: ["folk", "calm"] });
    expect(saved).toEqual(["folk", "calm"]);
    expect((await listTagsByEntryIds(db, [entry.id])).get(entry.id)).toEqual(["calm", "folk"]);

    // Replacement is a full set-overwrite.
    await setEntryTags(db, { entryId: entry.id, userId: owner.id, tags: ["jazz"] });
    expect((await listTagsByEntryIds(db, [entry.id])).get(entry.id)).toEqual(["jazz"]);

    // A different user cannot mutate the owner's tags.
    expect(await setEntryTags(db, { entryId: entry.id, userId: other.id, tags: ["x"] })).toBeNull();
    expect((await listTagsByEntryIds(db, [entry.id])).get(entry.id)).toEqual(["jazz"]);

    // Duplicate input is de-duplicated rather than violating the unique constraint.
    expect(await setEntryTags(db, { entryId: entry.id, userId: owner.id, tags: ["pop", "pop"] })).toEqual([
      "pop",
    ]);
  });
});

describe("progress DAL (DL-43)", () => {
  it("records progress only on the owner's entry", async () => {
    const owner = await user("owner@example.com");
    const other = await user("other@example.com");
    const entry = await entryFor(owner.id, "current");

    expect(await updateEntryProgress(db, { entryId: entry.id, userId: other.id, progress: 10, updatedAt: new Date() })).toBeNull();
    const updated = await updateEntryProgress(db, { entryId: entry.id, userId: owner.id, progress: 120, updatedAt: new Date() });
    expect(updated?.progress).toBe(120);
  });
});

describe("goals DAL (DL-43)", () => {
  it("upserts idempotently per user/period/key and reads back the active goal", async () => {
    const u = await user("g@example.com");
    await upsertGoal(db, { userId: u.id, period: "year", periodKey: "2026", targetCount: 12 });
    const bumped = await upsertGoal(db, { userId: u.id, period: "year", periodKey: "2026", targetCount: 24 });
    expect(bumped.targetCount).toBe(24);
    expect((await getActiveGoal(db, u.id, "year", "2026"))?.targetCount).toBe(24);
    expect(await getActiveGoal(db, u.id, "year", "2025")).toBeNull();
  });

  it("counts finished entries within a date window", async () => {
    const u = await user("c@example.com");
    await entryFor(u.id, "finished", new Date("2026-03-15T00:00:00Z"));
    await entryFor(u.id, "finished", new Date("2025-12-31T00:00:00Z")); // outside the window
    await entryFor(u.id, "current", new Date("2026-03-15T00:00:00Z")); // not finished
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2027-01-01T00:00:00Z");
    expect(await countFinishedBetween(db, u.id, from, to)).toBe(1);
  });
});

describe("achievements DAL (DL-43)", () => {
  it("inserts unlocks idempotently and lists them per user", async () => {
    const u = await user("a@example.com");
    await insertAchievementUnlocks(db, u.id, ["first_finish", "first_review"]);
    await insertAchievementUnlocks(db, u.id, ["first_finish"]); // duplicate is a no-op
    const unlocked = await listUserAchievements(db, u.id);
    expect(unlocked.map((a) => a.achievementKey).sort()).toEqual(["first_finish", "first_review"]);
  });
});

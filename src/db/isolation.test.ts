/**
 * Per-user isolation integration tests (DL-51, Req 14.3, 15.1). Confirms the v2
 * write paths and achievement bookkeeping never leak across users, against
 * pglite with the committed migrations applied.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerMember } from "@/lib/auth/service";
import { recordNewlyUnlocked } from "@/lib/achievements-service";
import {
  getActiveGoal,
  insertMediaItem,
  listTagsByEntryIds,
  listUserAchievements,
  saveReview,
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

async function finishedEntry(userId: string) {
  const media = await insertMediaItem(db, {
    type: "ebook",
    title: "Circe",
    creator: "Madeline Miller",
    genre: "Mythic Fiction",
    language: "English",
    description: "",
    coverTheme: "gold",
  });
  return upsertEntryStatus(db, {
    userId,
    mediaItemId: media.id,
    status: "finished",
    updatedAt: new Date("2026-06-01T00:00:00Z"),
  });
}

describe("per-user isolation (DL-51)", () => {
  it("keeps goals, tags, progress, reviews, and achievements scoped to their owner", async () => {
    const a = await user("a@example.com");
    const b = await user("b@example.com");
    const entryA = await finishedEntry(a.id);

    // Goal: A's goal is invisible to B.
    await upsertGoal(db, { userId: a.id, period: "year", periodKey: "2026", targetCount: 12 });
    expect((await getActiveGoal(db, a.id, "year", "2026"))?.targetCount).toBe(12);
    expect(await getActiveGoal(db, b.id, "year", "2026")).toBeNull();

    // Tags / progress / review: B cannot mutate A's entry.
    expect(await setEntryTags(db, { entryId: entryA.id, userId: b.id, tags: ["x"] })).toBeNull();
    expect(
      await updateEntryProgress(db, { entryId: entryA.id, userId: b.id, progress: 10, updatedAt: new Date() }),
    ).toBeNull();
    expect(
      await saveReview(db, { entryId: entryA.id, userId: b.id, rating: 1, review: "no", updatedAt: new Date() }),
    ).toBeNull();

    // The owner can, and the tag read is scoped to the entry.
    await setEntryTags(db, { entryId: entryA.id, userId: a.id, tags: ["fiction"] });
    expect((await listTagsByEntryIds(db, [entryA.id])).get(entryA.id)).toEqual(["fiction"]);

    // Achievements: recording A's unlocks never creates rows for B.
    await saveReview(db, {
      entryId: entryA.id,
      userId: a.id,
      rating: 5,
      review: "brilliant",
      updatedAt: new Date("2026-06-01T00:00:00Z"),
    });
    await recordNewlyUnlocked(db, a.id, new Date("2026-06-01T12:00:00Z"));
    expect((await listUserAchievements(db, a.id)).length).toBeGreaterThan(0);
    expect(await listUserAchievements(db, b.id)).toEqual([]);
  });
});

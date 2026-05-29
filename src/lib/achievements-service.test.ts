/**
 * Integration test (DL-44) for server-side achievement unlocking: a qualifying
 * mutation records exactly the satisfied achievements, idempotently, scoped to
 * the acting user, against pglite with migrations applied.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerMember } from "@/lib/auth/service";
import { recordNewlyUnlocked } from "@/lib/achievements-service";
import { insertMediaItem, listUserAchievements, saveReview, upsertEntryStatus } from "@/db/queries";
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

describe("recordNewlyUnlocked (DL-44)", () => {
  it("unlocks first_finish + first_review after a finish + review, idempotently", async () => {
    const u = await user("ava@example.com");
    const media = await insertMediaItem(db, {
      type: "ebook",
      title: "Circe",
      creator: "Madeline Miller",
      genre: "Mythic Fiction",
      language: "English",
      description: "",
      coverTheme: "gold",
    });
    const entry = await upsertEntryStatus(db, {
      userId: u.id,
      mediaItemId: media.id,
      status: "finished",
      updatedAt: new Date("2026-06-01T00:00:00Z"),
    });
    await saveReview(db, {
      entryId: entry.id,
      userId: u.id,
      rating: 5,
      review: "brilliant",
      updatedAt: new Date("2026-06-01T00:00:00Z"),
    });

    const now = new Date("2026-06-01T12:00:00Z");
    await recordNewlyUnlocked(db, u.id, now);
    await recordNewlyUnlocked(db, u.id, now); // idempotent

    const unlocked = (await listUserAchievements(db, u.id)).map((a) => a.achievementKey).sort();
    expect(unlocked).toEqual(["first_finish", "first_review"]);
  });

  it("records nothing for a user with no qualifying data", async () => {
    const u = await user("empty@example.com");
    await recordNewlyUnlocked(db, u.id, new Date("2026-06-01T12:00:00Z"));
    expect(await listUserAchievements(db, u.id)).toEqual([]);
  });
});

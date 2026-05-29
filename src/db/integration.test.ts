import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loginMember, registerMember } from "@/lib/auth/service";
import { createSession, resolveSession, revokeSession } from "@/lib/auth/session";
import {
  findEntry,
  findUserByEmail,
  getActiveGoal,
  insertActivity,
  insertMediaItem,
  listFeed,
  listMedia,
  listUserAchievements,
  saveReview,
  upsertEntryStatus,
} from "@/db/queries";
import type { Db } from "./client";
import { seed } from "./seed";
import { seedMediaItems } from "./seed-data";
import { createTestDb } from "./test-db";

let db: Db;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createTestDb());
});
afterEach(async () => {
  await close();
});

async function register(email: string) {
  const result = await registerMember(db, { name: email, email, password: "readmore" });
  if (!result.ok) throw new Error(`registration failed: ${result.error}`);
  return result.user;
}

describe("auth integration (DL-36)", () => {
  it("registers, logs in, and rejects a wrong password", async () => {
    await register("Ava@Example.com");
    expect((await loginMember(db, { email: "ava@example.com", password: "readmore" }))?.email).toBe(
      "ava@example.com",
    );
    expect(await loginMember(db, { email: "ava@example.com", password: "wrong" })).toBeNull();
  });

  it("rejects duplicate-email registration (Req 9.6)", async () => {
    await register("ava@example.com");
    const dup = await registerMember(db, { name: "x", email: "ava@example.com", password: "pw" });
    expect(dup.ok).toBe(false);
  });

  it("revokes a session so the token no longer resolves (Req 9.5)", async () => {
    const user = await register("ava@example.com");
    const { token } = await createSession(db, user.id);
    expect((await resolveSession(db, token))?.id).toBe(user.id);
    await revokeSession(db, token);
    expect(await resolveSession(db, token)).toBeNull();
  });
});

describe("library + feed integration (DL-36)", () => {
  it("an added shelf entry surfaces in the community feed (Req 7.4, 4.x)", async () => {
    const user = await register("ava@example.com");
    const media = await insertMediaItem(db, {
      type: "ebook",
      title: "Circe",
      creator: "Madeline Miller",
      genre: "Mythic Fiction",
      language: "English",
      description: "",
      coverTheme: "gold",
    });
    await upsertEntryStatus(db, {
      userId: user.id,
      mediaItemId: media.id,
      status: "current",
      updatedAt: new Date(),
    });
    await insertActivity(db, {
      userId: user.id,
      mediaItemId: media.id,
      action: "started",
      detail: "started reading",
      createdAt: new Date(),
    });
    const feed = await listFeed(db);
    expect(feed.some((e) => e.itemTitle === "Circe" && e.actorName === "ava@example.com")).toBe(true);
  });

  it("denies reviewing another user's entry (Req 9.7)", async () => {
    const owner = await register("owner@example.com");
    const other = await register("other@example.com");
    const media = await insertMediaItem(db, {
      type: "ebook",
      title: "Babel",
      creator: "R. F. Kuang",
      genre: "Historical Fantasy",
      language: "English",
      description: "",
      coverTheme: "crimson",
    });
    const entry = await upsertEntryStatus(db, {
      userId: owner.id,
      mediaItemId: media.id,
      status: "finished",
      updatedAt: new Date(),
    });
    // A different user cannot review the owner's entry.
    expect(
      await saveReview(db, {
        entryId: entry.id,
        userId: other.id,
        rating: 5,
        review: "nope",
        updatedAt: new Date(),
      }),
    ).toBeNull();
    // The owner can.
    const saved = await saveReview(db, {
      entryId: entry.id,
      userId: owner.id,
      rating: 5,
      review: "brilliant",
      updatedAt: new Date(),
    });
    expect(saved?.rating).toBe(5);
    expect(await findEntry(db, owner.id, media.id)).not.toBeNull();
  });
});

describe("migration + seed integration (DL-36, Req 10.5)", () => {
  it("seeds the catalog and a working demo login", async () => {
    await seed(db);
    const feed = await listFeed(db);
    expect(feed.length).toBeGreaterThan(0);
    // Demo member can sign in with the seeded password.
    expect((await loginMember(db, { email: "ava@example.com", password: "readmore" }))).not.toBeNull();
    // Whole starter catalog present, spanning multiple media types.
    const allMedia = await listFeed(db, {});
    expect(allMedia.length).toBeGreaterThan(0);
    expect(seedMediaItems.length).toBe(16);
    const types = new Set((await listMedia(db)).map((m) => m.type));
    expect(types.size).toBeGreaterThan(1);
    expect(types.has("music")).toBe(true);

    // Demo member has a goal and derived achievement unlocks (Req 14.4).
    const ava = await findUserByEmail(db, "ava@example.com");
    expect(ava).not.toBeNull();
    if (ava) {
      expect((await getActiveGoal(db, ava.id, "year", "2026"))?.targetCount).toBe(24);
      expect((await listUserAchievements(db, ava.id)).length).toBeGreaterThan(0);
    }
  });
});

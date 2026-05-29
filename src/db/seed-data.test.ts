import { describe, expect, it } from "vitest";
import { isLibraryStatus } from "@/lib/types";
import {
  seedActivities,
  seedCommunityUsers,
  seedDemoMember,
  seedLibraryEntries,
  seedMediaItems,
} from "./seed-data";

describe("seed data (DL-16)", () => {
  it("seeds the full starter catalog as ebooks (Req 6.4)", () => {
    expect(seedMediaItems.length).toBe(11);
    expect(seedMediaItems.every((m) => m.type === "ebook")).toBe(true);
  });

  it("uses unique media and community keys", () => {
    const mediaKeys = seedMediaItems.map((m) => m.key);
    expect(new Set(mediaKeys).size).toBe(mediaKeys.length);
    const userKeys = seedCommunityUsers.map((u) => u.key);
    expect(new Set(userKeys).size).toBe(userKeys.length);
  });

  it("provides a demo member with an email and book preferences", () => {
    expect(seedDemoMember.email).toBe("ava@example.com");
    expect(seedDemoMember.password.length).toBeGreaterThan(0);
    expect(seedDemoMember.preferences.books.favoriteGenres).toContain("Science Fiction");
  });

  it("keeps community users credential-free (no email/password fields)", () => {
    for (const u of seedCommunityUsers) {
      expect(u).not.toHaveProperty("email");
      expect(u).not.toHaveProperty("password");
    }
  });

  it("references valid media/user keys with valid statuses and ratings", () => {
    const mediaKeys = new Set(seedMediaItems.map((m) => m.key));
    const userKeys = new Set([seedDemoMember.key, ...seedCommunityUsers.map((u) => u.key)]);

    for (const e of seedLibraryEntries) {
      expect(mediaKeys.has(e.mediaKey)).toBe(true);
      expect(userKeys.has(e.userKey)).toBe(true);
      expect(isLibraryStatus(e.status)).toBe(true);
      if (e.rating !== null) expect(e.rating).toBeGreaterThanOrEqual(1);
      if (e.rating !== null) expect(e.rating).toBeLessThanOrEqual(5);
    }
    for (const a of seedActivities) {
      expect(mediaKeys.has(a.mediaKey)).toBe(true);
      expect(userKeys.has(a.userKey)).toBe(true);
    }
  });
});

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
  it("seeds a multi-type starter catalog (Req 1.1, 14.4)", () => {
    expect(seedMediaItems.length).toBe(16);
    const types = new Set(seedMediaItems.map((m) => m.type));
    expect(types).toEqual(new Set(["ebook", "music", "podcast", "movie", "tv"]));
    // Non-ebook items carry type-specific metadata.
    const music = seedMediaItems.find((m) => m.type === "music");
    expect(music?.metadata?.kind).toBe("music");
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

import { describe, expect, it } from "vitest";
import { toActivity, toFeedEntry, toLibraryEntry, toUser } from "./mappers";
import type { ActivityRow, LibraryEntryRow, MediaItemRow, UserRow } from "./schema";

const user: UserRow = {
  id: "u-ava",
  kind: "member",
  name: "Ava Patel",
  email: "ava@example.com",
  avatarColor: "#2f7d7e",
  avatarUrl: null,
  bio: "Weekend reader",
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
};

const media: MediaItemRow = {
  id: "m-1",
  type: "ebook",
  title: "Circe",
  creator: "Madeline Miller",
  genre: "Mythic Fiction",
  language: "English",
  description: "",
  coverTheme: "gold",
  artworkUrl: null,
  artworkCheckedAt: null,
  metadata: null,
  enrichment: null,
  enrichmentCheckedAt: null,
  totalUnits: null,
};

describe("db mappers (DL-15)", () => {
  it("maps a user row and narrows kind", () => {
    const result = toUser(user);
    expect(result).toEqual({
      id: "u-ava",
      kind: "member",
      name: "Ava Patel",
      email: "ava@example.com",
      avatarColor: "#2f7d7e",
      avatarUrl: null,
      bio: "Weekend reader",
    });
  });

  it("preserves a null email for community actors", () => {
    expect(toUser({ ...user, kind: "community", email: null }).email).toBeNull();
  });

  it("converts library entry timestamps to ISO strings", () => {
    const row: LibraryEntryRow = {
      id: "le-1",
      userId: "u-ava",
      mediaItemId: "m-1",
      status: "finished",
      rating: 5,
      review: "Quietly brilliant.",
      progress: 318,
      updatedAt: new Date("2026-05-27T20:35:00.000Z"),
    };
    const entry = toLibraryEntry(row);
    expect(entry.updatedAt).toBe("2026-05-27T20:35:00.000Z");
    expect(entry.status).toBe("finished");
    expect(entry.rating).toBe(5);
    expect(entry.progress).toBe(318);
  });

  it("converts activity timestamps to ISO strings", () => {
    const row: ActivityRow = {
      id: "a-1",
      userId: "u-ava",
      mediaItemId: "m-1",
      action: "reviewed",
      detail: "rated it 5 stars",
      createdAt: new Date("2026-05-27T20:35:00.000Z"),
    };
    expect(toActivity(row).createdAt).toBe("2026-05-27T20:35:00.000Z");
  });

  it("assembles a feed entry from joined activity, actor, and media", () => {
    const activity: ActivityRow = {
      id: "a-2",
      userId: "u-ava",
      mediaItemId: "m-1",
      action: "started",
      detail: "started reading",
      createdAt: new Date("2026-05-28T02:10:00.000Z"),
    };
    expect(toFeedEntry(activity, user, media)).toEqual({
      id: "a-2",
      actorName: "Ava Patel",
      avatarColor: "#2f7d7e",
      detail: "started reading",
      itemTitle: "Circe",
      mediaType: "ebook",
      createdAt: "2026-05-28T02:10:00.000Z",
    });
  });
});

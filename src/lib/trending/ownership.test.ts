import { describe, expect, it } from "vitest";
import { ownedTrendingKeys, trendingItemKey } from "./ownership";
import type { LibraryEntry, MediaItem } from "@/lib/types";

function media(over: Partial<MediaItem> & { id: string }): MediaItem {
  return {
    type: "ebook",
    title: "T",
    creator: "C",
    genre: "g",
    language: "English",
    description: "",
    coverTheme: "teal",
    ...over,
  };
}
function entry(mediaItemId: string): LibraryEntry {
  return { id: `e-${mediaItemId}`, userId: "u", mediaItemId, status: "wishlist", rating: null, review: "", updatedAt: "" };
}

describe("trending ownership (DL-59)", () => {
  it("keys are type-scoped and case-insensitive", () => {
    expect(trendingItemKey({ mediaType: "ebook", title: " Circe ", creator: "Madeline MILLER" })).toBe(
      "ebook|circe|madeline miller",
    );
  });

  it("builds the owned set from entries joined to media", () => {
    const m = [media({ id: "m1", type: "ebook", title: "Circe", creator: "Madeline Miller" })];
    const keys = ownedTrendingKeys([entry("m1"), entry("missing")], m);
    expect(keys.has(trendingItemKey({ mediaType: "ebook", title: "circe", creator: "madeline miller" }))).toBe(true);
    expect(keys.size).toBe(1); // the entry referencing missing media is skipped
  });
});

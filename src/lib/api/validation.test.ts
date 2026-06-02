import { describe, expect, it } from "vitest";
import {
  parseTypeFilter,
  validateAddTrending,
  validateCustomMedia,
  validateGoal,
  validateLibraryUpsert,
  validateProfileUpdate,
  validateProgress,
  validateReview,
  validateTags,
} from "./validation";

describe("API request validation (DL-26)", () => {
  it("accepts a valid profile update and normalizes preferences", () => {
    const result = validateProfileUpdate({
      name: "  Ava  ",
      email: " ava@example.com ",
      bio: " hi ",
      preferences: { books: { favoriteGenres: ["SF", 1] } },
    });
    expect(result?.name).toBe("Ava");
    expect(result?.email).toBe("ava@example.com");
    expect(result?.preferences.books.favoriteGenres).toEqual(["SF"]);
    expect(result?.preferences.music.favoriteArtists).toEqual([]);
  });

  it("rejects a profile update missing name or email", () => {
    expect(validateProfileUpdate({ name: "", email: "a@b.com" })).toBeNull();
    expect(validateProfileUpdate({ name: "Ava", email: "" })).toBeNull();
  });

  it("validates library upsert status", () => {
    expect(validateLibraryUpsert({ mediaItemId: "m-1", status: "finished" })).toEqual({
      mediaItemId: "m-1",
      status: "finished",
    });
    expect(validateLibraryUpsert({ mediaItemId: "m-1", status: "archived" })).toBeNull();
    expect(validateLibraryUpsert({ mediaItemId: "", status: "wishlist" })).toBeNull();
  });

  it("validates review rating bounds (1–5 integer)", () => {
    expect(validateReview({ entryId: "e-1", rating: 5, review: "great" })?.rating).toBe(5);
    expect(validateReview({ entryId: "e-1", rating: 0 })).toBeNull();
    expect(validateReview({ entryId: "e-1", rating: 6 })).toBeNull();
    expect(validateReview({ entryId: "e-1", rating: 3.5 })).toBeNull();
    expect(validateReview({ entryId: "", rating: 3 })).toBeNull();
  });

  it("parses the type filter (missing/all/blank => no filter; trims; bounds length)", () => {
    expect(parseTypeFilter(null)).toBeUndefined();
    expect(parseTypeFilter("all")).toBeUndefined();
    expect(parseTypeFilter("  ")).toBeUndefined();
    expect(parseTypeFilter(" ebook ")).toBe("ebook");
    expect(parseTypeFilter("x".repeat(100))).toBeUndefined();
  });

  it("trims status before validating", () => {
    expect(validateLibraryUpsert({ mediaItemId: "m-1", status: " finished " })?.status).toBe(
      "finished",
    );
  });

  it("validates custom media and defaults language to English", () => {
    const result = validateCustomMedia({
      title: "T",
      creator: "C",
      genre: "G",
      status: "wishlist",
    });
    expect(result?.language).toBe("English");
    expect(validateCustomMedia({ title: "", creator: "C", genre: "G", status: "wishlist" })).toBeNull();
    expect(validateCustomMedia({ title: "T", creator: "C", genre: "G", status: "x" })).toBeNull();
  });
});

describe("v2 request validation (DL-44)", () => {
  it("defaults custom media type to ebook and captures type/metadata/tags", () => {
    const ebook = validateCustomMedia({ title: "T", creator: "C", genre: "G", status: "wishlist" });
    expect(ebook?.type).toBe("ebook");
    expect(ebook?.tags).toEqual([]);

    const music = validateCustomMedia({
      type: "music",
      title: "Blue",
      creator: "Joni",
      genre: "Folk",
      status: "current",
      metadata: { album: "Blue" },
      tags: ["Folk", "folk", " calm "],
    });
    expect(music?.type).toBe("music");
    expect(music?.metadata).toEqual({ kind: "music", album: "Blue" });
    expect(music?.tags).toEqual(["folk", "calm"]);
  });

  it("accepts a trending add with no creator (e.g. TV/movies) and only requires a title", () => {
    const tv = validateAddTrending({
      type: "tv_movie",
      title: "Severance",
      creator: "",
      artworkUrl: "https://image.tmdb.org/t/p/w500/sev.jpg",
    });
    expect(tv).not.toBeNull();
    expect(tv?.creator).toBe("");
    expect(tv?.status).toBe("wishlist");
    expect(tv?.artworkUrl).toBe("https://image.tmdb.org/t/p/w500/sev.jpg");

    // A title is still required; insecure artwork is dropped.
    expect(validateAddTrending({ title: "", creator: "x" })).toBeNull();
    expect(validateAddTrending({ title: "Dune", artworkUrl: "http://insecure/x.jpg" })?.artworkUrl).toBeNull();
  });

  it("validates tags input", () => {
    expect(validateTags({ entryId: "e-1", tags: ["A", "a"] })).toEqual({ entryId: "e-1", tags: ["a"] });
    expect(validateTags({ entryId: "", tags: [] })).toBeNull();
  });

  it("validates progress as a non-negative integer", () => {
    expect(validateProgress({ entryId: "e-1", progress: 120 })).toEqual({ entryId: "e-1", progress: 120 });
    expect(validateProgress({ entryId: "e-1", progress: -1 })).toBeNull();
    expect(validateProgress({ entryId: "e-1", progress: 1.5 })).toBeNull();
    expect(validateProgress({ entryId: "", progress: 1 })).toBeNull();
  });

  it("validates a goal target and defaults the period", () => {
    expect(validateGoal({ targetCount: 24 })).toEqual({ period: "year", periodKey: null, targetCount: 24 });
    expect(validateGoal({ targetCount: 12, period: "year", periodKey: "2026" })).toEqual({
      period: "year",
      periodKey: "2026",
      targetCount: 12,
    });
    expect(validateGoal({ targetCount: 0 })).toBeNull();
    expect(validateGoal({ targetCount: 2.5 })).toBeNull();
  });
});

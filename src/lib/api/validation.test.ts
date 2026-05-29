import { describe, expect, it } from "vitest";
import {
  parseTypeFilter,
  validateCustomMedia,
  validateLibraryUpsert,
  validateProfileUpdate,
  validateReview,
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

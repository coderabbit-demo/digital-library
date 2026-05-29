import { describe, expect, it } from "vitest";
import { emptyPreferences, normalizePreferences } from "./preferences";

describe("preferences normalization (DL-22)", () => {
  it("builds the full empty shape", () => {
    expect(emptyPreferences()).toEqual({
      books: { favoriteAuthors: [], favoriteGenres: [], languages: [] },
      music: { favoriteArtists: [], favoriteGenres: [] },
      podcasts: { topics: [] },
      streaming: { favoriteGenres: [] },
    });
  });

  it("coerces missing/invalid sections to empty arrays", () => {
    expect(normalizePreferences(null)).toEqual(emptyPreferences());
    expect(normalizePreferences({ books: "nope", music: { favoriteArtists: 5 } })).toEqual(
      emptyPreferences(),
    );
  });

  it("keeps only string entries from arrays", () => {
    const result = normalizePreferences({
      books: { favoriteAuthors: ["Le Guin", 7, null, "Kuang"] },
    });
    expect(result.books.favoriteAuthors).toEqual(["Le Guin", "Kuang"]);
  });
});

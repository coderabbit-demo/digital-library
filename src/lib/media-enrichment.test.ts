import { describe, expect, it } from "vitest";
import { parseMediaEnrichment } from "./media-enrichment";

describe("parseMediaEnrichment", () => {
  it("returns null for unknown types", () => {
    expect(parseMediaEnrichment("widget", { foo: 1 })).toBeNull();
  });

  it("keeps only valid tv_movie fields and drops malformed ones", () => {
    const out = parseMediaEnrichment("tv_movie", {
      tmdbId: 603,
      runtimeMinutes: 136,
      genres: ["Action", "Action", "Sci-Fi", ""],
      releaseDate: "1999-03-31",
      tagline: "  Free your mind  ",
      cast: ["Keanu Reeves", 42, "Carrie-Anne Moss"],
      voteAverage: 8.2,
      voteCount: 25000,
      bogus: "ignored",
    });
    expect(out).toEqual({
      kind: "tv_movie",
      tmdbId: 603,
      runtimeMinutes: 136,
      genres: ["Action", "Sci-Fi"], // de-duped, blank dropped
      releaseDate: "1999-03-31",
      tagline: "Free your mind", // trimmed
      cast: ["Keanu Reeves", "Carrie-Anne Moss"], // non-strings dropped
      voteAverage: 8.2,
      voteCount: 25000,
    });
  });

  it("rejects out-of-range scores and negative counts", () => {
    const out = parseMediaEnrichment("tv_movie", { voteAverage: 11, voteCount: -3, runtimeMinutes: 1.5 });
    expect(out).toEqual({ kind: "tv_movie" });
  });

  it("parses ebook fields including dual rating sources", () => {
    const out = parseMediaEnrichment("ebook", {
      pageCount: 412,
      publisher: "Tor",
      publishedDate: "2015",
      categories: ["Fiction", "Fantasy"],
      isbn13: "9780765326355",
      averageRating: 4.3,
      ratingsCount: 1200,
      openLibraryRating: 4.1,
      openLibraryRatingsCount: 88,
    });
    expect(out).toEqual({
      kind: "ebook",
      pageCount: 412,
      publisher: "Tor",
      publishedDate: "2015",
      categories: ["Fiction", "Fantasy"],
      isbn13: "9780765326355",
      averageRating: 4.3,
      ratingsCount: 1200,
      openLibraryRating: 4.1,
      openLibraryRatingsCount: 88,
    });
  });

  it("parses music and podcast fields", () => {
    expect(parseMediaEnrichment("music", { genre: "Jazz", trackCount: 9, discCount: 1, label: "Blue Note" })).toEqual({
      kind: "music",
      genre: "Jazz",
      trackCount: 9,
      discCount: 1,
      label: "Blue Note",
    });
    expect(parseMediaEnrichment("podcast", { publisher: "NPR", episodeCount: 240, genre: "News" })).toEqual({
      kind: "podcast",
      publisher: "NPR",
      episodeCount: 240,
      genre: "News",
    });
  });

  it("returns a bare kind object when the payload is empty or non-object", () => {
    expect(parseMediaEnrichment("music", null)).toEqual({ kind: "music" });
    expect(parseMediaEnrichment("ebook", "garbage")).toEqual({ kind: "ebook" });
  });
});

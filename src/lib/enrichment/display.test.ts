import { describe, expect, it } from "vitest";
import { selectEnrichmentFields, selectScoreBadges, typeHasReviewsSection } from "./display";

describe("selectEnrichmentFields", () => {
  it("returns [] for null enrichment", () => {
    expect(selectEnrichmentFields(null)).toEqual([]);
  });

  it("formats tv_movie fields and omits absent ones (no score row)", () => {
    expect(
      selectEnrichmentFields({
        kind: "tv_movie",
        runtimeMinutes: 136,
        genres: ["Action", "Sci-Fi"],
        cast: ["Keanu Reeves"],
        voteAverage: 8.2,
      }),
    ).toEqual([
      { label: "Runtime", value: "136 mins" },
      { label: "Genres", value: "Action, Sci-Fi" },
      { label: "Cast", value: "Keanu Reeves" },
    ]);
  });

  it("formats ebook fields preferring isbn13", () => {
    expect(
      selectEnrichmentFields({ kind: "ebook", pageCount: 412, isbn13: "9780765326355", isbn10: "0765326353" }),
    ).toEqual([
      { label: "Pages", value: "412" },
      { label: "ISBN", value: "9780765326355" },
    ]);
  });

  it("hides a single disc but shows multiple", () => {
    expect(selectEnrichmentFields({ kind: "music", trackCount: 9, discCount: 1 })).toEqual([
      { label: "Tracks", value: "9 tracks" },
    ]);
    expect(selectEnrichmentFields({ kind: "music", discCount: 2 })).toEqual([{ label: "Discs", value: "2 discs" }]);
  });
});

describe("typeHasReviewsSection", () => {
  it("is true only for tv_movie and ebook", () => {
    expect(typeHasReviewsSection("tv_movie")).toBe(true);
    expect(typeHasReviewsSection("ebook")).toBe(true);
    expect(typeHasReviewsSection("music")).toBe(false);
    expect(typeHasReviewsSection("podcast")).toBe(false);
  });
});

describe("selectScoreBadges", () => {
  it("builds a TMDB badge with vote count", () => {
    expect(selectScoreBadges({ kind: "tv_movie", voteAverage: 8.2, voteCount: 25000 })).toEqual([
      { source: "TMDB", value: "8.2 / 10", count: "25,000 votes" },
    ]);
  });

  it("builds both book sources when present", () => {
    expect(
      selectScoreBadges({
        kind: "ebook",
        averageRating: 4.3,
        ratingsCount: 1200,
        openLibraryRating: 4.1,
        openLibraryRatingsCount: 88,
      }),
    ).toEqual([
      { source: "Google Books", value: "4.3 / 5", count: "1,200 ratings" },
      { source: "Open Library", value: "4.1 / 5", count: "88 ratings" },
    ]);
  });

  it("returns [] when there are no scores", () => {
    expect(selectScoreBadges({ kind: "ebook", pageCount: 100 })).toEqual([]);
    expect(selectScoreBadges({ kind: "music", genre: "Jazz" })).toEqual([]);
  });
});

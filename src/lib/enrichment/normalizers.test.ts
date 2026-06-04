import { describe, expect, it } from "vitest";
import { normalizeGoogleBooksVolume } from "./googlebooks";
import { normalizeItunesAlbum, normalizeItunesPodcast } from "./itunes";
import { normalizeMusicBrainzRelease } from "./musicbrainz";
import { normalizeOpenLibraryRatings, normalizeOpenLibrarySearch } from "./openlibrary";
import { normalizeTmdbDetail } from "./tmdb";

describe("normalizeTmdbDetail", () => {
  it("maps a movie detail with credits, capping cast and validating score", () => {
    const out = normalizeTmdbDetail("movie", 603, {
      runtime: 136,
      genres: [{ name: "Action" }, { name: "Sci-Fi" }],
      release_date: "1999-03-31",
      tagline: "Free your mind",
      vote_average: 8.2,
      vote_count: 25000,
      credits: { cast: Array.from({ length: 20 }, (_, i) => ({ name: `Actor ${i}` })) },
    });
    expect(out?.tmdbId).toBe(603);
    expect(out?.runtimeMinutes).toBe(136);
    expect(out?.genres).toEqual(["Action", "Sci-Fi"]);
    expect(out?.cast?.length).toBe(8); // capped
    expect(out?.voteAverage).toBe(8.2);
  });

  it("uses episode_run_time and first_air_date for TV, with season/episode counts and synopsis", () => {
    const out = normalizeTmdbDetail("tv", 1396, {
      episode_run_time: [47],
      first_air_date: "2008-01-20",
      vote_average: 8.9,
      number_of_seasons: 5,
      number_of_episodes: 62,
      overview: "A chemistry teacher turns to crime.",
    });
    expect(out?.runtimeMinutes).toBe(47);
    expect(out?.releaseDate).toBe("2008-01-20");
    expect(out?.seasons).toBe(5);
    expect(out?.episodes).toBe(62);
    expect(out?.synopsis).toBe("A chemistry teacher turns to crime.");
  });

  it("captures a synopsis but no season/episode counts for movies", () => {
    const out = normalizeTmdbDetail("movie", 603, {
      overview: "A hacker learns the truth.",
      number_of_seasons: 9, // ignored for movies
    });
    expect(out?.synopsis).toBe("A hacker learns the truth.");
    expect(out?.seasons).toBeUndefined();
    expect(out?.episodes).toBeUndefined();
  });

  it("still returns the tmdbId and type when the detail is unusable", () => {
    expect(normalizeTmdbDetail("movie", 7, null)).toEqual({ kind: "video", tmdbId: 7, tmdbType: "movie" });
  });
});

describe("normalizeGoogleBooksVolume", () => {
  it("maps volumeInfo including ISBNs and rating", () => {
    const out = normalizeGoogleBooksVolume({
      items: [
        {
          volumeInfo: {
            pageCount: 412,
            publisher: "Tor",
            publishedDate: "2015-08-01",
            categories: ["Fiction", "Fantasy"],
            industryIdentifiers: [
              { type: "ISBN_10", identifier: "0765326353" },
              { type: "ISBN_13", identifier: "9780765326355" },
            ],
            averageRating: 4.3,
            ratingsCount: 1200,
          },
        },
      ],
    });
    expect(out).toEqual({
      kind: "ebook",
      pageCount: 412,
      publisher: "Tor",
      publishedDate: "2015-08-01",
      categories: ["Fiction", "Fantasy"],
      isbn10: "0765326353",
      isbn13: "9780765326355",
      averageRating: 4.3,
      ratingsCount: 1200,
    });
  });

  it("returns null when there is no volume", () => {
    expect(normalizeGoogleBooksVolume({ items: [] })).toBeNull();
    expect(normalizeGoogleBooksVolume(null)).toBeNull();
  });
});

describe("normalizeOpenLibrary", () => {
  it("extracts the work key and subjects from search", () => {
    const out = normalizeOpenLibrarySearch({ docs: [{ key: "/works/OL1W", subject: ["Epic", "Epic", "Myth"] }] });
    expect(out.workKey).toBe("/works/OL1W");
    expect(out.subjects).toEqual(["Epic", "Myth"]);
  });

  it("reads the ratings summary on a 0-5 scale", () => {
    expect(normalizeOpenLibraryRatings({ summary: { average: 4.1, count: 88 } })).toEqual({ rating: 4.1, count: 88 });
    expect(normalizeOpenLibraryRatings({ summary: { average: 9 } })).toEqual({ rating: undefined, count: undefined });
    expect(normalizeOpenLibraryRatings(null)).toEqual({ rating: undefined, count: undefined });
  });
});

describe("normalizeItunes", () => {
  it("maps an album result to music fields", () => {
    expect(
      normalizeItunesAlbum({ results: [{ primaryGenreName: "Jazz", releaseDate: "1959-08-17", trackCount: 9 }] }),
    ).toEqual({ kind: "music", genre: "Jazz", releaseDate: "1959-08-17", trackCount: 9 });
  });

  it("maps a podcast result to podcast fields", () => {
    expect(
      normalizeItunesPodcast({ results: [{ artistName: "NPR", trackCount: 240, primaryGenreName: "News" }] }),
    ).toEqual({ kind: "podcast", publisher: "NPR", episodeCount: 240, genre: "News" });
  });

  it("returns null for empty results", () => {
    expect(normalizeItunesAlbum({ results: [] })).toBeNull();
    expect(normalizeItunesPodcast(null)).toBeNull();
  });
});

describe("normalizeMusicBrainzRelease", () => {
  it("maps date, label, track count (summed) and disc count", () => {
    const out = normalizeMusicBrainzRelease({
      releases: [
        {
          date: "1997-09-29",
          "label-info": [{ label: { name: "Parlophone" } }],
          media: [{ "track-count": 6 }, { "track-count": 6 }],
        },
      ],
    });
    expect(out).toEqual({ kind: "music", releaseDate: "1997-09-29", label: "Parlophone", trackCount: 12, discCount: 2 });
  });

  it("returns null when there is no release", () => {
    expect(normalizeMusicBrainzRelease({ releases: [] })).toBeNull();
  });
});

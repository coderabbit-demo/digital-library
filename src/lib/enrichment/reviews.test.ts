import { describe, expect, it, vi } from "vitest";
import type { MediaEnrichment } from "@/lib/types";
import {
  fetchReviewExcerpts,
  normalizeTmdbReviews,
  REVIEW_EXCERPT_LIMIT,
  REVIEW_EXCERPT_MAX_CHARS,
} from "./reviews";

describe("normalizeTmdbReviews", () => {
  it("caps the number of excerpts", () => {
    const results = Array.from({ length: 10 }, (_, i) => ({
      author: `Author ${i}`,
      content: "Great film.",
      url: `https://www.themoviedb.org/review/${i}`,
    }));
    expect(normalizeTmdbReviews({ results }).length).toBe(REVIEW_EXCERPT_LIMIT);
  });

  it("truncates long bodies with an ellipsis and flags them", () => {
    const long = "word ".repeat(200).trim();
    const [review] = normalizeTmdbReviews({ results: [{ author: "Ann", content: long }] });
    expect(review?.truncated).toBe(true);
    expect(review?.excerpt.endsWith("…")).toBe(true);
    expect(review?.excerpt.length).toBeLessThanOrEqual(REVIEW_EXCERPT_MAX_CHARS + 1);
  });

  it("keeps short bodies intact and reads the author rating", () => {
    const [review] = normalizeTmdbReviews({
      results: [{ author: "Bo", content: "Loved it.", author_details: { rating: 9 }, url: "https://x/r/1" }],
    });
    expect(review).toEqual({
      source: "tmdb",
      author: "Bo",
      excerpt: "Loved it.",
      truncated: false,
      rating: 9,
      url: "https://x/r/1",
    });
  });

  it("drops non-https links and entries missing author or content", () => {
    const [review] = normalizeTmdbReviews({
      results: [
        { author: "", content: "no author" },
        { author: "Cy", content: "ok", url: "http://insecure/r" },
      ],
    });
    expect(review?.author).toBe("Cy");
    expect(review?.url).toBeNull();
  });

  it("tolerates malformed payloads", () => {
    expect(normalizeTmdbReviews(null)).toEqual([]);
    expect(normalizeTmdbReviews({ results: "nope" })).toEqual([]);
  });
});

const tmdbEnrichment: MediaEnrichment = { kind: "tv_movie", tmdbId: 603, tmdbType: "movie" };

describe("fetchReviewExcerpts", () => {
  it("returns [] for non-movie/TV items without calling out", async () => {
    const fetchImpl = vi.fn();
    const out = await fetchReviewExcerpts(
      { type: "ebook", enrichment: { kind: "ebook" } },
      { fetchImpl: fetchImpl as unknown as typeof fetch, env: { TMDB_API_KEY: "k" } },
    );
    expect(out).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns [] when there is no resolved tmdbId", async () => {
    const fetchImpl = vi.fn();
    const out = await fetchReviewExcerpts(
      { type: "tv_movie", enrichment: { kind: "tv_movie" } },
      { fetchImpl: fetchImpl as unknown as typeof fetch, env: { TMDB_API_KEY: "k" } },
    );
    expect(out).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns [] when the TMDB key is absent", async () => {
    const fetchImpl = vi.fn();
    const out = await fetchReviewExcerpts(
      { type: "tv_movie", enrichment: tmdbEnrichment },
      { fetchImpl: fetchImpl as unknown as typeof fetch, env: {} },
    );
    expect(out).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fetches and normalizes reviews for a movie via the movie endpoint", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("/movie/603/reviews");
      return {
        ok: true,
        json: async () => ({ results: [{ author: "Ann", content: "Superb." }] }),
      } as unknown as Response;
    }) as unknown as typeof fetch;
    const out = await fetchReviewExcerpts(
      { type: "tv_movie", enrichment: tmdbEnrichment },
      { fetchImpl, env: { TMDB_API_KEY: "k" } },
    );
    expect(out).toEqual([{ source: "tmdb", author: "Ann", excerpt: "Superb.", truncated: false, rating: null, url: null }]);
  });
});

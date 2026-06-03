import { describe, expect, it, vi } from "vitest";
import { normalizeTmdbSearch, tmdbMoviesSearchProvider, tmdbTvSearchProvider } from "./tmdb";

const movies = {
  results: [
    { id: 1, title: "Dune", poster_path: "/dune.jpg" },
    { id: 2, title: "No Poster", poster_path: null },
    { id: 3 }, // no title → skipped
  ],
};

describe("tmdb search (media-search DL-82)", () => {
  it("normalizes movies: title, poster URL, ids, empty creator; skips title-less", () => {
    const items = normalizeTmdbSearch(movies, "movie", 25);
    expect(items.map((i) => i.title)).toEqual(["Dune", "No Poster"]);
    const dune = items[0]!;
    expect(dune.source).toBe("tmdb-movies");
    expect(dune.mediaType).toBe("tv_movie");
    expect(dune.listLabel).toBe("Movies");
    expect(dune.creator).toBe("");
    expect(dune.artworkUrl).toBe("https://image.tmdb.org/t/p/w500/dune.jpg");
    expect(dune.externalId).toBe("movie:1");
    expect(items[1]!.artworkUrl).toBeNull();
  });

  it("uses name + the TV label for tv", () => {
    const items = normalizeTmdbSearch({ results: [{ id: 7, name: "Severance", poster_path: "/s.jpg" }] }, "tv", 25);
    expect(items[0]!.title).toBe("Severance");
    expect(items[0]!.source).toBe("tmdb-tv");
    expect(items[0]!.listLabel).toBe("TV Shows");
    expect(items[0]!.externalId).toBe("tv:7");
  });

  it("is configured only with TMDB_API_KEY and queries the search endpoint", async () => {
    expect(tmdbMoviesSearchProvider.isConfigured({})).toBe(false);
    expect(tmdbTvSearchProvider.isConfigured({ TMDB_API_KEY: "k" })).toBe(true);
    const prev = process.env.TMDB_API_KEY;
    process.env.TMDB_API_KEY = "test-key";
    try {
      const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => movies }) as unknown as Response) as unknown as typeof fetch;
      await tmdbMoviesSearchProvider.search("dune", { limit: 5, fetchImpl });
      const url = String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
      expect(url).toContain("api.themoviedb.org/3/search/movie");
      expect(url).toContain("query=dune");
      expect(url).toContain("api_key=test-key");

      // The key comes from the passed env (same source as isConfigured), not just process.env.
      const fetch2 = vi.fn(async () => ({ ok: true, json: async () => movies }) as unknown as Response) as unknown as typeof fetch;
      await tmdbMoviesSearchProvider.search("dune", { limit: 5, fetchImpl: fetch2, env: { TMDB_API_KEY: "env-key" } });
      expect(String((fetch2 as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toContain("api_key=env-key");
    } finally {
      if (prev === undefined) delete process.env.TMDB_API_KEY;
      else process.env.TMDB_API_KEY = prev;
    }
  });
});

import { describe, expect, it, vi } from "vitest";
import { normalizeTmdb, tmdbMoviesProvider, tmdbTvProvider } from "./tmdb";

const moviePayload = {
  results: [
    { id: 1, title: "Dune: Part Two", poster_path: "/dune2.jpg", overview: "..." },
    { id: 2, title: "No Poster Movie", poster_path: null },
    { id: 3, overview: "no title" }, // skipped
  ],
};
const tvPayload = {
  results: [{ id: 10, name: "Severance", poster_path: "/sev.jpg" }],
};

describe("tmdb provider (trending-podcasts-tv-movies DL-77)", () => {
  it("normalizes movies: title, poster URL, list label, rank, ids; skips title-less", () => {
    const items = normalizeTmdb(moviePayload, "movie", 50);
    expect(items.map((i) => i.title)).toEqual(["Dune: Part Two", "No Poster Movie"]);

    const dune = items[0]!;
    expect(dune.source).toBe("tmdb-movies");
    expect(dune.mediaType).toBe("movie");
    expect(dune.listLabel).toBe("Trending Movies");
    expect(dune.rank).toBe(1);
    expect(dune.creator).toBe(""); // TMDB trending carries no creator
    expect(dune.artworkUrl).toBe("https://image.tmdb.org/t/p/w500/dune2.jpg");
    expect(dune.externalId).toBe("movie:1");
    expect(items[1]!.artworkUrl).toBeNull(); // no poster
  });

  it("normalizes TV using `name` and the TV list label", () => {
    const items = normalizeTmdb(tvPayload, "tv", 50);
    expect(items[0]!.title).toBe("Severance");
    expect(items[0]!.source).toBe("tmdb-tv");
    expect(items[0]!.listLabel).toBe("Trending TV");
    expect(items[0]!.externalId).toBe("tv:10");
  });

  it("caps to the limit and tolerates malformed payloads", () => {
    expect(normalizeTmdb(moviePayload, "movie", 1).map((i) => i.title)).toEqual(["Dune: Part Two"]);
    expect(normalizeTmdb({}, "tv", 10)).toEqual([]);
    expect(normalizeTmdb(null, "movie", 10)).toEqual([]);
  });

  it("is configured only with TMDB_API_KEY and fetches the right endpoint", async () => {
    expect(tmdbMoviesProvider.isConfigured({})).toBe(false);
    expect(tmdbMoviesProvider.isConfigured({ TMDB_API_KEY: "k" })).toBe(true);
    expect(tmdbTvProvider.isConfigured({ TMDB_API_KEY: "k" })).toBe(true);
    expect(tmdbMoviesProvider.mediaType).toBe("movie");
    expect(tmdbTvProvider.mediaType).toBe("tv");

    const prev = process.env.TMDB_API_KEY;
    process.env.TMDB_API_KEY = "test-key";
    try {
      const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => moviePayload }) as unknown as Response) as unknown as typeof fetch;
      await tmdbMoviesProvider.fetchTrending({ limit: 5, fetchImpl });
      const url = String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
      expect(url).toContain("api.themoviedb.org/3/trending/movie/week");
      expect(url).toContain("api_key=test-key");

      const bad = vi.fn(async () => ({ ok: false, status: 401 }) as unknown as Response) as unknown as typeof fetch;
      await expect(tmdbTvProvider.fetchTrending({ limit: 5, fetchImpl: bad })).rejects.toThrow();
    } finally {
      if (prev === undefined) delete process.env.TMDB_API_KEY;
      else process.env.TMDB_API_KEY = prev;
    }
  });
});

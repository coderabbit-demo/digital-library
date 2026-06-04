import { describe, expect, it, vi } from "vitest";
import { enrichItem } from "./dispatch";

/** Build a fetch that answers by URL substring; unmatched URLs 404. A substring
 *  mapped to the `throw` sentinel rejects, exercising provider isolation. */
function fetchByUrl(routes: Array<[match: string, body: unknown | "throw"]>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [match, body] of routes) {
      if (url.includes(match)) {
        if (body === "throw") throw new Error("network");
        return { ok: true, json: async () => body } as unknown as Response;
      }
    }
    return { ok: false, json: async () => ({}) } as unknown as Response;
  }) as unknown as typeof fetch;
}

const NO_ENV: Record<string, string | undefined> = {};

describe("enrichItem dispatch", () => {
  it("returns null for an unknown media type and makes no calls", async () => {
    const fetchImpl = vi.fn();
    const out = await enrichItem(
      { type: "boardgame", title: "Catan", creator: "" },
      { fetchImpl: fetchImpl as unknown as typeof fetch, env: NO_ENV },
    );
    expect(out).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("enriches tv_movie via TMDB search then detail", async () => {
    const fetchImpl = fetchByUrl([
      ["/search/movie", { results: [{ id: 603 }] }],
      ["/movie/603", { runtime: 136, vote_average: 8.2, genres: [{ name: "Sci-Fi" }] }],
    ]);
    const out = await enrichItem(
      { type: "tv_movie", title: "The Matrix", creator: "" },
      { fetchImpl, env: { TMDB_API_KEY: "k" } },
    );
    expect(out).toMatchObject({ kind: "video", tmdbId: 603, runtimeMinutes: 136, voteAverage: 8.2 });
  });

  it("queries only the movie endpoint for a movie item (type-directed)", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/search/movie")) return { ok: true, json: async () => ({ results: [{ id: 1 }] }) } as unknown as Response;
      if (url.includes("/movie/1")) return { ok: true, json: async () => ({ runtime: 100 }) } as unknown as Response;
      return { ok: false, json: async () => ({}) } as unknown as Response;
    }) as unknown as typeof fetch;
    const out = await enrichItem(
      { type: "movie", title: "Heat", creator: "" },
      { fetchImpl, env: { TMDB_API_KEY: "k" } },
    );
    expect(out).toMatchObject({ kind: "video", tmdbType: "movie", runtimeMinutes: 100 });
    expect(calls.some((u) => u.includes("/search/tv") || u.includes("/tv/"))).toBe(false);
  });

  it("returns null for tv_movie when the key is absent (no TMDB call)", async () => {
    const fetchImpl = vi.fn();
    const out = await enrichItem(
      { type: "tv_movie", title: "The Matrix", creator: "" },
      { fetchImpl: fetchImpl as unknown as typeof fetch, env: NO_ENV },
    );
    expect(out).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("merges Google Books and Open Library for books, combining categories", async () => {
    const fetchImpl = fetchByUrl([
      ["googleapis.com/books", { items: [{ volumeInfo: { pageCount: 412, categories: ["Fantasy"], averageRating: 4.3 } }] }],
      ["search.json", { docs: [{ key: "/works/OL1W", subject: ["Epic"] }] }],
      ["/ratings.json", { summary: { average: 4.1, count: 88 } }],
    ]);
    const out = await enrichItem(
      { type: "ebook", title: "Mistborn", creator: "Brandon Sanderson" },
      { fetchImpl, env: { GOOGLE_BOOKS_API_KEY: "gk" } },
    );
    expect(out).toMatchObject({
      kind: "ebook",
      pageCount: 412,
      averageRating: 4.3,
      openLibraryRating: 4.1,
      openLibraryRatingsCount: 88,
    });
    expect((out as { categories?: string[] }).categories).toEqual(["Fantasy", "Epic"]); // merged
  });

  it("skips Google Books when its key is absent but still enriches from Open Library", async () => {
    const fetchImpl = fetchByUrl([
      ["googleapis.com/books", "throw"], // must not be called; would reject if it were
      ["search.json", { docs: [{ key: "/works/OL1W", subject: ["Epic"] }] }],
      ["/ratings.json", { summary: { average: 4.1, count: 88 } }],
    ]);
    const out = await enrichItem(
      { type: "ebook", title: "Mistborn", creator: "Brandon Sanderson" },
      { fetchImpl, env: NO_ENV },
    );
    expect(out).toMatchObject({ kind: "ebook", openLibraryRating: 4.1 });
    expect((out as { pageCount?: number }).pageCount).toBeUndefined();
  });

  it("isolates a failing source: iTunes data survives a MusicBrainz failure", async () => {
    const fetchImpl = fetchByUrl([
      ["itunes.apple.com", { results: [{ primaryGenreName: "Jazz", trackCount: 9, releaseDate: "1959-08-17" }] }],
      ["musicbrainz.org", "throw"],
    ]);
    const out = await enrichItem(
      { type: "music", title: "Kind of Blue", creator: "Miles Davis" },
      { fetchImpl, env: NO_ENV },
    );
    expect(out).toMatchObject({ kind: "music", genre: "Jazz", trackCount: 9, releaseDate: "1959-08-17" });
  });

  it("enriches a podcast via iTunes", async () => {
    const fetchImpl = fetchByUrl([
      ["entity=podcast", { results: [{ artistName: "NPR", trackCount: 240, primaryGenreName: "News" }] }],
    ]);
    const out = await enrichItem(
      { type: "podcast", title: "Up First", creator: "NPR" },
      { fetchImpl, env: NO_ENV },
    );
    expect(out).toEqual({ kind: "podcast", publisher: "NPR", episodeCount: 240, genre: "News" });
  });
});

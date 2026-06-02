/**
 * Registry + degradation gate (DL-63; extended DL-77). Exercises the real
 * provider registry without network: keyed providers report `unconfigured`
 * without credentials (no upstream call), while the keyless Apple Podcasts
 * provider is always configured and is the only one that fetches.
 */
import { describe, expect, it, vi } from "vitest";
import { fetchTrendingFeed } from "./feed";
import { TRENDING_PROVIDERS } from "./registry";

describe("trending registry (DL-63, DL-77)", () => {
  it("registers the books, music, podcast, and TV/movie providers", () => {
    expect([...TRENDING_PROVIDERS].map((p) => p.id).sort()).toEqual([
      "apple-podcasts",
      "nyt",
      "spotify",
      "tmdb-movies",
      "tmdb-tv",
    ]);
    expect([...new Set(TRENDING_PROVIDERS.map((p) => p.mediaType))].sort()).toEqual([
      "ebook",
      "music",
      "podcast",
      "tv_movie",
    ]);
  });

  it("reports keyed sources unconfigured (no upstream call) while the keyless podcast source is ok", async () => {
    // Only the keyless Apple provider should call fetch; keyed ones short-circuit.
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ feed: { results: [] } }) }) as unknown as Response) as unknown as typeof fetch;

    const res = await fetchTrendingFeed({ env: {}, fetchImpl });
    const byId = Object.fromEntries(res.sources.map((s) => [s.source, s.status]));

    expect(res.sources).toHaveLength(5);
    expect(byId.nyt).toBe("unconfigured");
    expect(byId.spotify).toBe("unconfigured");
    expect(byId["tmdb-movies"]).toBe("unconfigured");
    expect(byId["tmdb-tv"]).toBe("unconfigured");
    expect(byId["apple-podcasts"]).toBe("ok");
    // Exactly one upstream call — the keyless podcast provider.
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });
});

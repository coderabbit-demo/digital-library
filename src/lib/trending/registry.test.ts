/**
 * Registry + degradation gate (DL-63). Exercises the real provider registry
 * without any network: with no credentials, every source is reported
 * `unconfigured` and no provider fetch (so no upstream call) is made.
 */
import { describe, expect, it } from "vitest";
import { fetchTrendingFeed } from "./feed";
import { TRENDING_PROVIDERS } from "./registry";

describe("trending registry (DL-63)", () => {
  it("registers the NYT (books) and Spotify (music) providers", () => {
    expect([...TRENDING_PROVIDERS].map((p) => p.id).sort()).toEqual(["nyt", "spotify"]);
    expect([...TRENDING_PROVIDERS].map((p) => p.mediaType).sort()).toEqual(["ebook", "music"]);
  });

  it("reports all sources unconfigured and makes no upstream call without keys", async () => {
    const noNetwork = (() => {
      throw new Error("no network access in tests");
    }) as typeof fetch;

    const res = await fetchTrendingFeed({ env: {}, fetchImpl: noNetwork });
    expect(res.sources).toHaveLength(2);
    expect(res.sources.every((s) => s.status === "unconfigured" && s.items.length === 0)).toBe(true);
  });
});

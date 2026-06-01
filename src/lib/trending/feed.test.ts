import { describe, expect, it } from "vitest";
import type { TrendingItem } from "@/lib/types";
import { fetchTrendingFeed } from "./feed";
import type { TrendingProvider } from "./provider";

function item(source: string, title: string): TrendingItem {
  return {
    source,
    sourceLabel: source,
    mediaType: source === "spotify" ? "music" : "ebook",
    title,
    creator: "c",
    listLabel: "l",
    rank: null,
    genre: null,
    artworkUrl: null,
    externalUrl: null,
    externalId: null,
  };
}

function fakeProvider(over: Partial<TrendingProvider> & { id: string }): TrendingProvider {
  return {
    id: over.id,
    label: over.label ?? over.id,
    mediaType: over.mediaType ?? "ebook",
    isConfigured: over.isConfigured ?? (() => true),
    fetchTrending: over.fetchTrending ?? (async () => [item(over.id, "x")]),
  };
}

describe("fetchTrendingFeed (DL-56)", () => {
  it("returns ok sources with items when providers succeed", async () => {
    const providers = [
      fakeProvider({ id: "nyt", fetchTrending: async () => [item("nyt", "Circe")] }),
      fakeProvider({ id: "spotify", mediaType: "music", fetchTrending: async () => [item("spotify", "Blue")] }),
    ];
    const res = await fetchTrendingFeed({ providers, env: {} });
    expect(res.sources.map((s) => [s.source, s.status])).toEqual([
      ["nyt", "ok"],
      ["spotify", "ok"],
    ]);
    expect(res.sources[0]!.items[0]!.title).toBe("Circe");
  });

  it("isolates a failing provider so others still return ok", async () => {
    const providers = [
      fakeProvider({ id: "nyt", fetchTrending: async () => { throw new Error("boom"); } }),
      fakeProvider({ id: "spotify", fetchTrending: async () => [item("spotify", "Blue")] }),
    ];
    const res = await fetchTrendingFeed({ providers, env: {} });
    expect(res.sources.find((s) => s.source === "nyt")).toMatchObject({ status: "error", items: [] });
    expect(res.sources.find((s) => s.source === "spotify")?.status).toBe("ok");
  });

  it("marks an unconfigured provider without calling it", async () => {
    let called = false;
    const providers = [
      fakeProvider({
        id: "nyt",
        isConfigured: () => false,
        fetchTrending: async () => {
          called = true;
          return [];
        },
      }),
    ];
    const res = await fetchTrendingFeed({ providers, env: {} });
    expect(res.sources[0]).toMatchObject({ status: "unconfigured", items: [] });
    expect(called).toBe(false);
  });

  it("passes the clamped limit to providers and supports the source filter", async () => {
    let seenLimit = 0;
    const providers = [
      fakeProvider({
        id: "nyt",
        fetchTrending: async ({ limit }) => {
          seenLimit = limit;
          return [item("nyt", "x")];
        },
      }),
      fakeProvider({ id: "spotify" }),
    ];
    const res = await fetchTrendingFeed({ providers, env: {}, limit: 999, source: "nyt" });
    expect(res.sources.map((s) => s.source)).toEqual(["nyt"]); // filtered
    expect(seenLimit).toBe(50); // clamped to MAX_LIMIT
  });
});

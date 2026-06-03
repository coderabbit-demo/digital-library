import { describe, expect, it, vi } from "vitest";
import type { TrendingItem } from "@/lib/types";
import type { SearchProvider } from "./provider";
import { searchMedia } from "./search";
import { SEARCH_PROVIDERS } from "./registry";

function provider(id: string, mediaType: TrendingItem["mediaType"], impl: Partial<SearchProvider> = {}): SearchProvider {
  return {
    id,
    label: id,
    mediaType,
    isConfigured: () => true,
    search: async () => [
      {
        source: id,
        sourceLabel: id,
        mediaType,
        title: `${id} hit`,
        creator: "c",
        listLabel: "L",
        rank: 1,
        genre: null,
        artworkUrl: null,
        externalUrl: null,
        externalId: null,
      },
    ],
    ...impl,
  };
}

describe("searchMedia (media-search DL-82)", () => {
  it("aggregates configured providers for a query", async () => {
    const res = await searchMedia({
      query: "dune",
      providers: [provider("a", "ebook"), provider("b", "music")],
    });
    expect(res.sources.map((s) => s.status)).toEqual(["ok", "ok"]);
    expect(res.sources.flatMap((s) => s.items).map((i) => i.title)).toEqual(["a hit", "b hit"]);
  });

  it("isolates an unconfigured or throwing provider", async () => {
    const res = await searchMedia({
      query: "dune",
      providers: [
        provider("ok", "ebook"),
        provider("unconf", "music", { isConfigured: () => false }),
        provider("boom", "podcast", {
          search: async () => {
            throw new Error("upstream down");
          },
        }),
      ],
    });
    const byId = Object.fromEntries(res.sources.map((s) => [s.source, s.status]));
    expect(byId).toEqual({ ok: "ok", unconf: "unconfigured", boom: "error" });
  });

  it("makes no calls for an empty/whitespace query", async () => {
    const search = vi.fn();
    const res = await searchMedia({ query: "   ", providers: [provider("a", "ebook", { search })] });
    expect(res.sources).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it("registers one provider per media type (books, music, podcast, tv_movie)", () => {
    expect([...new Set(SEARCH_PROVIDERS.map((p) => p.mediaType))].sort()).toEqual([
      "ebook",
      "music",
      "podcast",
      "tv_movie",
    ]);
  });
});

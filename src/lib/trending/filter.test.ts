import { describe, expect, it } from "vitest";
import type { TrendingItem, TrendingResponse, TrendingSourceResult } from "@/lib/types";
import { filterTrendingFeed, trendingMediaTypes } from "./filter";

function mkItem(mediaType: TrendingItem["mediaType"], title: string): TrendingItem {
  return {
    source: "src",
    sourceLabel: "Src",
    mediaType,
    title,
    creator: "c",
    listLabel: "list",
    rank: null,
    genre: null,
    artworkUrl: null,
    externalUrl: null,
    externalId: title,
  };
}

function source(
  over: Partial<TrendingSourceResult> & Pick<TrendingSourceResult, "source" | "items">,
): TrendingSourceResult {
  return { mediaType: "ebook", label: over.source, status: "ok", ...over };
}

function feed(): TrendingResponse {
  return {
    sources: [
      source({ source: "nyt", mediaType: "ebook", items: [mkItem("ebook", "b1"), mkItem("ebook", "b2")] }),
      source({ source: "spotify", mediaType: "music", items: [mkItem("music", "a1")] }),
      source({ source: "mixed", mediaType: "ebook", items: [mkItem("ebook", "m1"), mkItem("music", "m2")] }),
      source({ source: "broken", mediaType: "music", status: "error", items: [] }),
    ],
  };
}

describe("filterTrendingFeed (DL-73)", () => {
  it("returns the feed unchanged for 'all' (Req 2.3)", () => {
    const f = feed();
    expect(filterTrendingFeed(f, "all")).toBe(f);
  });

  it("keeps only matching items and drops emptied source groups (Req 2.2)", () => {
    const result = filterTrendingFeed(feed(), "ebook");
    expect(result.sources.map((s) => s.source)).toEqual(["nyt", "mixed"]);
    expect(result.sources[0]?.items.map((i) => i.title)).toEqual(["b1", "b2"]);
    // mixed source keeps only its ebook item (item-level filter)
    expect(result.sources[1]?.items.map((i) => i.title)).toEqual(["m1"]);
  });

  it("filters by music across sources, preserving order (Req 2.2)", () => {
    const result = filterTrendingFeed(feed(), "music");
    expect(result.sources.map((s) => s.source)).toEqual(["spotify", "mixed"]);
    expect(result.sources[1]?.items.map((i) => i.title)).toEqual(["m2"]);
  });

  it("yields no source groups when nothing matches (Req 2.2, 6.5)", () => {
    expect(filterTrendingFeed(feed(), "podcast").sources).toEqual([]);
  });

  it("does not mutate the input feed", () => {
    const f = feed();
    filterTrendingFeed(f, "ebook");
    expect(f.sources).toHaveLength(4);
    expect(f.sources[2]?.items).toHaveLength(2);
  });
});

describe("trendingMediaTypes (DL-73)", () => {
  it("returns the distinct media types across healthy sources", () => {
    expect(trendingMediaTypes(feed())).toEqual(["ebook", "music"]);
  });

  it("ignores non-ok sources and is empty when there are no items", () => {
    const empty: TrendingResponse = {
      sources: [source({ source: "broken", status: "error", items: [mkItem("music", "x")] })],
    };
    expect(trendingMediaTypes(empty)).toEqual([]);
  });
});

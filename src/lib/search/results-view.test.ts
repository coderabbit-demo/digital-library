import { describe, expect, it } from "vitest";
import type { TrendingItem, TrendingSourceResult } from "@/lib/types";
import { filterResultSourcesByType, okResultSources } from "./results-view";

function item(source: string, mediaType: TrendingItem["mediaType"], title: string): TrendingItem {
  return {
    source,
    sourceLabel: source,
    mediaType,
    title,
    creator: "",
    listLabel: "",
    rank: null,
    genre: null,
    artworkUrl: null,
    externalUrl: null,
    externalId: title,
  };
}

const sources: TrendingSourceResult[] = [
  { source: "ol", mediaType: "ebook", label: "Books", status: "ok", items: [item("ol", "ebook", "Dune")] },
  {
    source: "itunes-music",
    mediaType: "music",
    label: "Music",
    status: "ok",
    items: [item("itunes-music", "music", "Album")],
  },
  { source: "tmdb", mediaType: "movie", label: "Movies", status: "error", items: [] },
  { source: "empty", mediaType: "podcast", label: "Podcasts", status: "ok", items: [] },
];

describe("okResultSources", () => {
  it("keeps only ok sources that returned at least one item", () => {
    expect(okResultSources(sources).map((s) => s.source)).toEqual(["ol", "itunes-music"]);
  });
});

describe("filterResultSourcesByType", () => {
  const ok = okResultSources(sources);

  it("passes everything through for 'all'", () => {
    expect(filterResultSourcesByType(ok, "all").map((s) => s.source)).toEqual(["ol", "itunes-music"]);
  });

  it("keeps only sources whose items match the active type, dropping emptied sources", () => {
    const filtered = filterResultSourcesByType(ok, "music");
    expect(filtered.map((s) => s.source)).toEqual(["itunes-music"]);
    expect(filtered[0]?.items).toHaveLength(1);
  });

  it("returns no sources when nothing matches", () => {
    expect(filterResultSourcesByType(ok, "movie")).toEqual([]);
  });

  it("does not mutate the input sources", () => {
    filterResultSourcesByType(ok, "music");
    expect(ok.map((s) => s.items.length)).toEqual([1, 1]);
  });
});

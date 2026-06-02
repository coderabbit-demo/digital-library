import { describe, expect, it } from "vitest";
import type { TrendingItem, TrendingResponse, TrendingSourceResult } from "@/lib/types";
import { buildTrendingSectionView, buildTrendingView } from "./view";

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
      source({ source: "broken", mediaType: "music", status: "error", items: [] }),
    ],
  };
}

describe("buildTrendingView (DL-73)", () => {
  it("defaults to the all view with data-driven options and counts", () => {
    const view = buildTrendingView(feed(), undefined);
    expect(view.activeType).toBe("all");
    expect(view.options).toEqual([
      { value: "all", label: "All", count: 3 },
      { value: "ebook", label: "Books", count: 2 },
      { value: "music", label: "Music", count: 1 },
    ]);
    // All view renders every source group (incl. the broken one's notice).
    expect(view.sources.map((s) => s.source)).toEqual(["nyt", "spotify", "broken"]);
    expect(view.showStatusNotices).toBe(true);
    expect(view.hasItems).toBe(true);
  });

  it("narrows to a selected type and hides status notices", () => {
    const view = buildTrendingView(feed(), "ebook");
    expect(view.activeType).toBe("ebook");
    expect(view.sources.map((s) => s.source)).toEqual(["nyt"]);
    expect(view.showStatusNotices).toBe(false);
  });

  it("falls back to the all view for a type that is not a present option (Req 1.7, 6.2)", () => {
    // "podcast" isn't in the data, so it isn't offered as an option.
    expect(buildTrendingView(feed(), "podcast").activeType).toBe("all");
  });

  it("reports no items when every source is unavailable", () => {
    const down: TrendingResponse = {
      sources: [source({ source: "broken", status: "error", items: [] })],
    };
    const view = buildTrendingView(down, undefined);
    expect(view.hasItems).toBe(false);
    expect(view.options).toEqual([{ value: "all", label: "All", count: 0 }]);
  });
});

describe("buildTrendingSectionView (DL-73)", () => {
  it("flattens ok items, builds options, and slices the preview for 'all'", () => {
    const view = buildTrendingSectionView(feed(), undefined, 2);
    expect(view.activeType).toBe("all");
    expect(view.options.map((o) => o.value)).toEqual(["all", "ebook", "music"]);
    // first two items across healthy sources
    expect(view.items.map((i) => i.title)).toEqual(["b1", "b2"]);
  });

  it("narrows by type BEFORE slicing to the preview limit (Req 3.2)", () => {
    const f: TrendingResponse = {
      sources: [
        source({ source: "nyt", items: [mkItem("ebook", "b1"), mkItem("ebook", "b2"), mkItem("ebook", "b3")] }),
        source({ source: "spotify", mediaType: "music", items: [mkItem("music", "a1")] }),
      ],
    };
    const view = buildTrendingSectionView(f, "music", 2);
    expect(view.activeType).toBe("music");
    expect(view.items.map((i) => i.title)).toEqual(["a1"]);
  });

  it("falls back to all for a type not present in the section's items", () => {
    expect(buildTrendingSectionView(feed(), "podcast", 8).activeType).toBe("all");
  });
});

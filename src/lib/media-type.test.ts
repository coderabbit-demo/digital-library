import { describe, expect, it } from "vitest";
import type { MediaItem } from "@/lib/types";
import {
  countMediaTypes,
  distinctMediaTypes,
  filterHref,
  mediaTypeCounts,
  mediaTypeLabel,
  mediaTypeOptions,
  resolveActiveType,
  typeFilterHrefFactory,
} from "./media-type";

const item = (type: string): MediaItem => ({
  id: type,
  type,
  title: "t",
  creator: "c",
  genre: "g",
  language: "English",
  description: "",
  coverTheme: "teal",
});

describe("media-type filter (DL-31)", () => {
  it("labels ebook as Books and humanizes unknown types (Req 5.3)", () => {
    expect(mediaTypeLabel("ebook")).toBe("Books");
    expect(mediaTypeLabel("music")).toBe("Music");
  });

  it("derives distinct types from media items", () => {
    expect(distinctMediaTypes([item("ebook"), item("ebook"), item("music")])).toEqual([
      "ebook",
      "music",
    ]);
  });

  it("builds an All option plus one per present type (Req 5.1, 5.2)", () => {
    expect(mediaTypeOptions(["ebook"])).toEqual([
      { value: "all", label: "All" },
      { value: "ebook", label: "Books" },
    ]);
  });

  it("counts items per type with an All total (Req 8.2)", () => {
    expect(mediaTypeCounts([item("ebook"), item("ebook"), item("music")])).toEqual([
      { value: "all", label: "All", count: 3 },
      { value: "ebook", label: "Books", count: 2 },
      { value: "music", label: "Music", count: 1 },
    ]);
    expect(mediaTypeCounts([])).toEqual([{ value: "all", label: "All", count: 0 }]);
  });

  it("supports non-ebook types without code changes (Req 6.2)", () => {
    expect(mediaTypeOptions(["ebook", "music"])).toEqual([
      { value: "all", label: "All" },
      { value: "ebook", label: "Books" },
      { value: "music", label: "Music" },
    ]);
  });

  it("carries the selection in the URL query (Req 5.7)", () => {
    expect(filterHref("all")).toBe("/");
    expect(filterHref("ebook")).toBe("/?type=ebook");
  });

  it("defaults unknown/missing selections to All (Req 5.6)", () => {
    const options = mediaTypeOptions(["ebook"]);
    expect(resolveActiveType(undefined, options)).toBe("all");
    expect(resolveActiveType("music", options)).toBe("all");
    expect(resolveActiveType("ebook", options)).toBe("ebook");
  });
});

describe("media-type filter parity (DL-73)", () => {
  it("counts media types from raw type strings, sorted, with All total (Req 1.2, 1.7)", () => {
    expect(countMediaTypes(["music", "ebook", "ebook"])).toEqual([
      { value: "all", label: "All", count: 3 },
      { value: "ebook", label: "Books", count: 2 },
      { value: "music", label: "Music", count: 1 },
    ]);
    expect(countMediaTypes([])).toEqual([{ value: "all", label: "All", count: 0 }]);
  });

  it("humanizes an unknown type as a label fallback (Req 1.6)", () => {
    expect(countMediaTypes(["audiobook"])).toEqual([
      { value: "all", label: "All", count: 1 },
      { value: "audiobook", label: "Audiobook", count: 1 },
    ]);
  });

  it("keeps mediaTypeCounts working over items by delegating to countMediaTypes", () => {
    expect(mediaTypeCounts([item("ebook"), item("music")])).toEqual([
      { value: "all", label: "All", count: 2 },
      { value: "ebook", label: "Books", count: 1 },
      { value: "music", label: "Music", count: 1 },
    ]);
  });

  it("resolves the active type against counted options too (Req 6.2)", () => {
    const counts = countMediaTypes(["ebook", "music"]);
    expect(resolveActiveType("music", counts)).toBe("music");
    expect(resolveActiveType("podcast", counts)).toBe("all");
    expect(resolveActiveType(undefined, counts)).toBe("all");
  });

  it("builds links for a base path, dropping the key for All (Req 6.1)", () => {
    const hrefFor = typeFilterHrefFactory({ basePath: "/trending" });
    expect(hrefFor("all")).toBe("/trending");
    expect(hrefFor("music")).toBe("/trending?type=music");
  });

  it("supports a custom query key (Req 3.3)", () => {
    const hrefFor = typeFilterHrefFactory({ basePath: "/", param: "trending" });
    expect(hrefFor("all")).toBe("/");
    expect(hrefFor("ebook")).toBe("/?trending=ebook");
  });

  it("preserves a sibling selection, omitting it when All/absent (Req 3.3, 6.1)", () => {
    const feedHref = typeFilterHrefFactory({
      basePath: "/",
      param: "type",
      preserve: { trending: "music" },
    });
    expect(feedHref("ebook")).toBe("/?trending=music&type=ebook");
    expect(feedHref("all")).toBe("/?trending=music");

    const noPreserve = typeFilterHrefFactory({
      basePath: "/",
      param: "type",
      preserve: { trending: "all" },
    });
    expect(noPreserve("ebook")).toBe("/?type=ebook");

    const undefPreserve = typeFilterHrefFactory({
      basePath: "/",
      param: "type",
      preserve: { trending: undefined },
    });
    expect(undefPreserve("ebook")).toBe("/?type=ebook");
  });

  it("url-encodes query values (Req 6.1)", () => {
    const hrefFor = typeFilterHrefFactory({ basePath: "/wishlist" });
    expect(hrefFor("tv movie")).toBe("/wishlist?type=tv%20movie");
  });
});

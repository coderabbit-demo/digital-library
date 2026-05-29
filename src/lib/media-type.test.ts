import { describe, expect, it } from "vitest";
import type { MediaItem } from "@/lib/types";
import {
  distinctMediaTypes,
  filterHref,
  mediaTypeLabel,
  mediaTypeOptions,
  resolveActiveType,
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

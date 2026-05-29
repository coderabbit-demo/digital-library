import { describe, expect, it } from "vitest";
import { formatMetaLine, isMediaKind, parseMediaMetadata } from "./media-metadata";
import type { MediaItem } from "@/lib/types";

const base: MediaItem = {
  id: "m",
  type: "ebook",
  title: "T",
  creator: "C",
  genre: "Fiction",
  language: "English",
  description: "",
  coverTheme: "teal",
};

describe("media-metadata (DL-42)", () => {
  it("parses per-type fields and ignores invalid ones", () => {
    expect(parseMediaMetadata("ebook", { pages: 320 })).toEqual({ kind: "ebook", pages: 320 });
    expect(parseMediaMetadata("ebook", { pages: -1 })).toEqual({ kind: "ebook" });
    expect(parseMediaMetadata("music", { album: " Blue " })).toEqual({ kind: "music", album: "Blue" });
    expect(parseMediaMetadata("podcast", { show: "Reply All", episodeCount: 187 })).toEqual({
      kind: "podcast",
      show: "Reply All",
      episodeCount: 187,
    });
    expect(parseMediaMetadata("tv_movie", { seasons: 4 })).toEqual({ kind: "tv_movie", seasons: 4 });
  });

  it("returns null for unknown media types (Req 1.5)", () => {
    expect(parseMediaMetadata("vinyl", { foo: 1 })).toBeNull();
    expect(isMediaKind("vinyl")).toBe(false);
    expect(isMediaKind("podcast")).toBe(true);
  });

  it("derives a type-appropriate meta line", () => {
    expect(formatMetaLine(base)).toBe("Fiction");
    expect(formatMetaLine({ ...base, type: "music", metadata: { kind: "music", album: "Blue" } })).toBe("Blue");
    expect(
      formatMetaLine({ ...base, type: "podcast", metadata: { kind: "podcast", show: "RA", episodeCount: 12 } }),
    ).toBe("RA · 12 episodes");
    expect(
      formatMetaLine({ ...base, type: "tv_movie", metadata: { kind: "tv_movie", seasons: 1 } }),
    ).toBe("Fiction · 1 season");
  });
});

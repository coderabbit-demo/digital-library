import { describe, expect, it } from "vitest";
import { formatMetaLine, isMediaKind, mediaTypeToMetadataKind, parseMediaMetadata } from "./media-metadata";
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
    expect(parseMediaMetadata("tv_movie", { seasons: 4 })).toEqual({ kind: "video", seasons: 4 });
  });

  it("maps movie/tv (and legacy tv_movie) to the shared video kind", () => {
    expect(mediaTypeToMetadataKind("movie")).toBe("video");
    expect(mediaTypeToMetadataKind("tv")).toBe("video");
    expect(mediaTypeToMetadataKind("tv_movie")).toBe("video");
    expect(mediaTypeToMetadataKind("ebook")).toBe("ebook");
    expect(mediaTypeToMetadataKind("vinyl")).toBeNull();
    // The movie and tv types both yield the video metadata shape.
    expect(parseMediaMetadata("movie", { runtimeMinutes: 116 })).toEqual({ kind: "video", runtimeMinutes: 116 });
    expect(parseMediaMetadata("tv", { seasons: 2 })).toEqual({ kind: "video", seasons: 2 });
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
      formatMetaLine({ ...base, type: "tv", metadata: { kind: "video", seasons: 1 } }),
    ).toBe("Fiction · 1 season");
  });
});

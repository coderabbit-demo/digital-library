import { describe, expect, it, vi } from "vitest";
import { ITUNES_MUSIC, ITUNES_PODCASTS, itunesMusicProvider, itunesPodcastsProvider, normalizeItunesSearch } from "./itunes";

const albums = {
  results: [
    {
      collectionName: "Blue",
      artistName: "Joni Mitchell",
      artworkUrl100: "https://is1/img/100x100bb.jpg",
      collectionViewUrl: "https://music.apple.com/album/blue",
      collectionId: 9,
    },
    { artistName: "no title" }, // skipped
  ],
};

describe("iTunes search (media-search DL-82)", () => {
  it("normalizes music albums with upscaled https artwork and ids", () => {
    const items = normalizeItunesSearch(albums, ITUNES_MUSIC, 25);
    expect(items.map((i) => i.title)).toEqual(["Blue"]);
    const blue = items[0]!;
    expect(blue.source).toBe("itunes-music");
    expect(blue.mediaType).toBe("music");
    expect(blue.creator).toBe("Joni Mitchell");
    expect(blue.artworkUrl).toBe("https://is1/img/600x600bb.jpg");
    expect(blue.externalId).toBe("9");
    expect(blue.listLabel).toBe("Music");
  });

  it("maps podcasts to the podcast type/label", () => {
    const items = normalizeItunesSearch(
      { results: [{ collectionName: "99% Invisible", artistName: "Roman Mars", artworkUrl100: "https://p/100x100bb.png" }] },
      ITUNES_PODCASTS,
      25,
    );
    expect(items[0]!.mediaType).toBe("podcast");
    expect(items[0]!.listLabel).toBe("Podcasts");
  });

  it("caps to the limit and tolerates malformed payloads", () => {
    const two = { results: [{ collectionName: "A", artistName: "x" }, { collectionName: "B", artistName: "y" }] };
    expect(normalizeItunesSearch(two, ITUNES_MUSIC, 1).map((i) => i.title)).toEqual(["A"]);
    expect(normalizeItunesSearch(null, ITUNES_PODCASTS, 5)).toEqual([]);
  });

  it("queries the right entity (keyless)", async () => {
    expect(itunesMusicProvider.isConfigured({})).toBe(true);
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => albums }) as unknown as Response) as unknown as typeof fetch;
    await itunesMusicProvider.search("blue", { limit: 5, fetchImpl });
    expect(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toContain("entity=album");
    expect(itunesPodcastsProvider.mediaType).toBe("podcast");
  });
});

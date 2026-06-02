import { describe, expect, it, vi } from "vitest";
import { applePodcastsProvider, normalizeApplePodcasts } from "./apple-podcasts";

const feed = {
  feed: {
    title: "Top Shows",
    results: [
      {
        id: "1200361736",
        name: "The Daily",
        artistName: "The New York Times",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/abc/100x100bb.png",
        url: "https://podcasts.apple.com/us/podcast/the-daily/id1200361736",
        genres: [{ name: "News" }, { name: "Daily News" }],
      },
      {
        id: "2",
        name: "99% Invisible",
        artistName: "Roman Mars",
        artworkUrl100: "http://insecure/100x100bb.png",
        url: "https://podcasts.apple.com/us/podcast/99-invisible/id2",
        genres: [],
      },
      { id: "3", artistName: "Nameless", artworkUrl100: "https://x/100x100bb.png" }, // no name → skipped
    ],
  },
};

describe("apple podcasts provider (cover-art trending DL-77)", () => {
  it("normalizes entries, ranks by chart order, upscales https artwork, skips nameless", () => {
    const items = normalizeApplePodcasts(feed, 50);
    expect(items.map((i) => i.title)).toEqual(["The Daily", "99% Invisible"]);

    const daily = items[0]!;
    expect(daily.source).toBe("apple-podcasts");
    expect(daily.mediaType).toBe("podcast");
    expect(daily.creator).toBe("The New York Times");
    expect(daily.listLabel).toBe("Top Shows");
    expect(daily.rank).toBe(1);
    expect(daily.genre).toBe("News");
    expect(daily.artworkUrl).toBe("https://is1-ssl.mzstatic.com/image/thumb/abc/600x600bb.png");
    expect(daily.externalId).toBe("1200361736");

    // Non-https artwork guarded to null; no genre → null.
    expect(items[1]!.artworkUrl).toBeNull();
    expect(items[1]!.genre).toBeNull();
    expect(items[1]!.rank).toBe(2);
  });

  it("caps to the limit and tolerates an empty/malformed payload", () => {
    expect(normalizeApplePodcasts(feed, 1).map((i) => i.title)).toEqual(["The Daily"]);
    expect(normalizeApplePodcasts({}, 10)).toEqual([]);
    expect(normalizeApplePodcasts(null, 10)).toEqual([]);
  });

  it("is always configured (keyless) and fetches the charts, throwing on a bad response", async () => {
    expect(applePodcastsProvider.isConfigured({})).toBe(true);
    expect(applePodcastsProvider.mediaType).toBe("podcast");

    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => feed }) as unknown as Response) as unknown as typeof fetch;
    const items = await applePodcastsProvider.fetchTrending({ limit: 5, fetchImpl });
    expect(items[0]?.title).toBe("The Daily");
    const url = String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
    expect(url).toContain("rss.marketingtools.apple.com");
    expect(url).toContain("/podcasts/top/5/podcasts.json");

    const bad = vi.fn(async () => ({ ok: false, status: 503 }) as unknown as Response) as unknown as typeof fetch;
    await expect(applePodcastsProvider.fetchTrending({ limit: 5, fetchImpl: bad })).rejects.toThrow();
  });
});

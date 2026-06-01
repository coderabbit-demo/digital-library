import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetSpotifyToken, getAppToken, normalizeNewReleases, spotifyMusicProvider } from "./spotify";

const payload = {
  albums: {
    items: [
      {
        id: "alb1",
        name: "Blue",
        artists: [{ name: "Joni Mitchell" }],
        images: [{ url: "https://i.scdn.co/blue.jpg" }],
        external_urls: { spotify: "https://open.spotify.com/album/alb1" },
      },
      { id: "alb2", name: "The Epic", artists: [{ name: "Kamasi Washington" }, { name: "Friends" }], images: [{ url: "http://insecure/epic.jpg" }] },
      { id: "alb1", name: "Blue (dup)" }, // duplicate id
      { name: "", artists: [] }, // no title → skipped
    ],
  },
};

describe("spotify music provider (DL-55)", () => {
  it("normalizes albums, joins artists, de-dups by id, guards non-https artwork", () => {
    const items = normalizeNewReleases(payload, 50);
    expect(items.map((i) => i.title)).toEqual(["Blue", "The Epic"]);
    const blue = items[0]!;
    expect(blue.source).toBe("spotify");
    expect(blue.mediaType).toBe("music");
    expect(blue.creator).toBe("Joni Mitchell");
    expect(blue.listLabel).toBe("New Releases");
    expect(blue.artworkUrl).toBe("https://i.scdn.co/blue.jpg");
    expect(blue.externalUrl).toBe("https://open.spotify.com/album/alb1");
    expect(items[1]!.creator).toBe("Kamasi Washington, Friends");
    expect(items[1]!.artworkUrl).toBeNull(); // http:// dropped
  });

  it("respects the limit and is empty-safe", () => {
    expect(normalizeNewReleases(payload, 1)).toHaveLength(1);
    expect(normalizeNewReleases({}, 10)).toEqual([]);
    expect(normalizeNewReleases(null, 10)).toEqual([]);
  });

  it("reports configuration from the environment", () => {
    expect(spotifyMusicProvider.isConfigured({})).toBe(false);
    expect(spotifyMusicProvider.isConfigured({ SPOTIFY_CLIENT_ID: "id" })).toBe(false);
    expect(spotifyMusicProvider.isConfigured({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "s" })).toBe(true);
  });
});

describe("spotify app token cache (DL-55)", () => {
  beforeEach(() => {
    __resetSpotifyToken();
    process.env.SPOTIFY_CLIENT_ID = "id";
    process.env.SPOTIFY_CLIENT_SECRET = "secret";
  });
  afterEach(() => {
    __resetSpotifyToken();
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
  });

  function tokenFetch(counter: { n: number }): typeof fetch {
    return ((..._args: Parameters<typeof fetch>) => {
      counter.n += 1;
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }) as typeof fetch;
  }

  it("fetches once and reuses the token until it nears expiry", async () => {
    const counter = { n: 0 };
    const f = tokenFetch(counter);
    const t0 = 1_000_000;
    expect(await getAppToken(t0, f)).toBe("tok");
    expect(await getAppToken(t0 + 1000, f)).toBe("tok"); // cached
    expect(counter.n).toBe(1);
    // Past expiry (3600s - 60s margin) → refreshes.
    expect(await getAppToken(t0 + 3600 * 1000, f)).toBe("tok");
    expect(counter.n).toBe(2);
  });
});

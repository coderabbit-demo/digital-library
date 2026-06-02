import { describe, expect, it, vi } from "vitest";
import { resolveItunesCover } from "./itunes";

/** Fetch stub that returns a payload chosen by the requested `entity=`. */
function byEntity(map: Record<string, unknown>, ok = true): typeof fetch {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const entity = new URL(url).searchParams.get("entity") ?? "";
    return { ok, json: async () => map[entity] ?? { results: [] } } as unknown as Response;
  }) as unknown as typeof fetch;
}

describe("resolveItunesCover (cover-art DL-75)", () => {
  it("matches an album and returns an upscaled https artwork URL", async () => {
    const fetchImpl = byEntity({
      album: {
        results: [
          {
            collectionName: "Blue",
            artistName: "Joni Mitchell",
            artworkUrl100: "https://is1.mzstatic.com/image/blue/100x100bb.jpg",
          },
        ],
      },
    });
    const url = await resolveItunesCover("Blue", "Joni Mitchell", ["album"], { fetchImpl });
    expect(url).toBe("https://is1.mzstatic.com/image/blue/600x600bb.jpg");
    const called = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(called).toContain("entity=album");
  });

  it("falls back through entities for TV/movies (movie then tvSeason)", async () => {
    const fetchImpl = byEntity({
      movie: { results: [{ trackName: "Something Else", artistName: "X", artworkUrl100: "https://a/100x100bb.jpg" }] },
      tvSeason: {
        results: [{ collectionName: "Severance", artistName: "Apple", artworkUrl100: "https://b/100x100bb.jpg" }],
      },
    });
    const url = await resolveItunesCover("Severance", "Apple", ["movie", "tvSeason"], { fetchImpl });
    expect(url).toBe("https://b/600x600bb.jpg");
  });

  it("matches a podcast by title alone (creator not required)", async () => {
    const fetchImpl = byEntity({
      podcast: {
        results: [{ collectionName: "99% Invisible", artistName: "Some Network", artworkUrl100: "https://p/100x100bb.jpg" }],
      },
    });
    expect(await resolveItunesCover("99% Invisible", "Roman Mars", ["podcast"], { fetchImpl })).toBe(
      "https://p/600x600bb.jpg",
    );
  });

  it("returns null when nothing matches or the artwork is not https", async () => {
    const noMatch = byEntity({ album: { results: [{ collectionName: "Other", artistName: "Nope", artworkUrl100: "https://a/100x100bb.jpg" }] } });
    expect(await resolveItunesCover("Blue", "Joni Mitchell", ["album"], { fetchImpl: noMatch })).toBeNull();

    const httpArt = byEntity({ album: { results: [{ collectionName: "Blue", artistName: "Joni Mitchell", artworkUrl100: "http://insecure/100x100bb.jpg" }] } });
    expect(await resolveItunesCover("Blue", "Joni Mitchell", ["album"], { fetchImpl: httpArt })).toBeNull();
  });
});

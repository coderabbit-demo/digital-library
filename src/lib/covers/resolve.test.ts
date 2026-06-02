import { describe, expect, it, vi } from "vitest";
import { isSupportedCoverType, resolveCover } from "./resolve";

function hostAwareFetch(): typeof fetch {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.host.includes("openlibrary.org")) {
      return { ok: true, json: async () => ({ docs: [{ cover_i: 7, title: "Circe", author_name: ["Madeline Miller"] }] }) } as unknown as Response;
    }
    // iTunes
    return {
      ok: true,
      json: async () => ({ results: [{ collectionName: "Blue", artistName: "Joni Mitchell", artworkUrl100: "https://a/100x100bb.jpg" }] }),
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

describe("resolveCover dispatcher (cover-art DL-75)", () => {
  it("routes ebooks to Open Library", async () => {
    const fetchImpl = hostAwareFetch();
    const url = await resolveCover({ type: "ebook", title: "Circe", creator: "Madeline Miller" }, { fetchImpl });
    expect(url).toBe("https://covers.openlibrary.org/b/id/7-M.jpg");
    expect(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toContain("openlibrary.org");
  });

  it("routes music to iTunes", async () => {
    const fetchImpl = hostAwareFetch();
    const url = await resolveCover({ type: "music", title: "Blue", creator: "Joni Mitchell" }, { fetchImpl });
    expect(url).toBe("https://a/600x600bb.jpg");
    expect(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toContain("itunes.apple.com");
  });

  it("returns null for an unsupported type without any lookup (Req 4.7)", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    expect(await resolveCover({ type: "boardgame", title: "Catan", creator: "Klaus" }, { fetchImpl })).toBeNull();
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("reports which types are supported", () => {
    expect(isSupportedCoverType("ebook")).toBe(true);
    expect(isSupportedCoverType("tv_movie")).toBe(true);
    expect(isSupportedCoverType("boardgame")).toBe(false);
  });
});

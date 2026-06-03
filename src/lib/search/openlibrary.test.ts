import { describe, expect, it, vi } from "vitest";
import { normalizeOpenLibrarySearch, openLibraryBooksProvider } from "./openlibrary";

const payload = {
  docs: [
    { key: "/works/OL1W", title: "Dune", author_name: ["Frank Herbert"], cover_i: 111 },
    { key: "/works/OL2W", title: "No Cover", author_name: ["A. Writer"] },
    { key: "/works/OL3W", author_name: ["Nameless"] }, // no title → skipped
  ],
};

describe("openLibrary search (media-search DL-82)", () => {
  it("normalizes books, ranks by order, builds the cover URL, skips title-less", () => {
    const items = normalizeOpenLibrarySearch(payload, 25);
    expect(items.map((i) => i.title)).toEqual(["Dune", "No Cover"]);
    const dune = items[0]!;
    expect(dune.source).toBe("openlibrary");
    expect(dune.mediaType).toBe("ebook");
    expect(dune.creator).toBe("Frank Herbert");
    expect(dune.rank).toBe(1);
    expect(dune.artworkUrl).toBe("https://covers.openlibrary.org/b/id/111-M.jpg");
    expect(dune.externalUrl).toBe("https://openlibrary.org/works/OL1W");
    expect(items[1]!.artworkUrl).toBeNull();
  });

  it("caps to limit and tolerates malformed payloads", () => {
    expect(normalizeOpenLibrarySearch(payload, 1).map((i) => i.title)).toEqual(["Dune"]);
    expect(normalizeOpenLibrarySearch({}, 10)).toEqual([]);
    expect(normalizeOpenLibrarySearch(null, 10)).toEqual([]);
  });

  it("is keyless and queries the search endpoint", async () => {
    expect(openLibraryBooksProvider.isConfigured({})).toBe(true);
    expect(openLibraryBooksProvider.mediaType).toBe("ebook");
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => payload }) as unknown as Response) as unknown as typeof fetch;
    const items = await openLibraryBooksProvider.search("dune", { limit: 5, fetchImpl });
    expect(items[0]?.title).toBe("Dune");
    const url = String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
    expect(url).toContain("openlibrary.org/search.json");
    expect(url).toContain("q=dune");
  });
});

import { describe, expect, it } from "vitest";
import { normalizeNytOverview, nytBooksProvider } from "./nyt";

const overview = {
  results: {
    lists: [
      {
        list_name: "Hardcover Fiction",
        books: [
          {
            rank: 1,
            title: "Circe",
            author: "Madeline Miller",
            primary_isbn13: "9780316556347",
            book_image: "https://images.nyt.com/circe.jpg",
            amazon_product_url: "https://amazon.com/circe",
          },
          { rank: 2, title: "Babel", author: "R. F. Kuang", book_image: "http://insecure/babel.jpg" },
        ],
      },
      {
        list_name: "Combined Print & E-Book Fiction",
        books: [
          { rank: 1, title: "Circe", author: "Madeline Miller", primary_isbn13: "9780316556347" },
          { rank: 4, title: "Educated", author: "Tara Westover" },
        ],
      },
    ],
  },
};

describe("nyt books provider (DL-54)", () => {
  it("normalizes books, de-dups across lists, and guards non-https artwork", () => {
    const items = normalizeNytOverview(overview, 50);
    expect(items.map((i) => i.title)).toEqual(["Circe", "Babel", "Educated"]);

    const circe = items[0]!;
    expect(circe.source).toBe("nyt");
    expect(circe.mediaType).toBe("ebook");
    expect(circe.creator).toBe("Madeline Miller");
    expect(circe.listLabel).toBe("Hardcover Fiction");
    expect(circe.rank).toBe(1);
    expect(circe.artworkUrl).toBe("https://images.nyt.com/circe.jpg");
    expect(circe.externalUrl).toBe("https://amazon.com/circe");
    expect(circe.externalId).toBe("9780316556347");

    expect(items[1]!.artworkUrl).toBeNull(); // http:// dropped
    expect(items[2]!.creator).toBe("Tara Westover");
  });

  it("respects the limit and is empty-safe", () => {
    expect(normalizeNytOverview(overview, 1)).toHaveLength(1);
    expect(normalizeNytOverview({}, 10)).toEqual([]);
    expect(normalizeNytOverview(null, 10)).toEqual([]);
  });

  it("reports configuration from the environment", () => {
    expect(nytBooksProvider.isConfigured({})).toBe(false);
    expect(nytBooksProvider.isConfigured({ NYT_API_KEY: "  " })).toBe(false);
    expect(nytBooksProvider.isConfigured({ NYT_API_KEY: "key" })).toBe(true);
  });
});

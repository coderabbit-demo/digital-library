import { describe, expect, it } from "vitest";
import type { LibraryEntry, MediaItem } from "@/lib/types";
import {
  composeShelfItems,
  filterShelfItems,
  filterShelfItemsByQuery,
  filterShelfItemsByType,
  resolveShelf,
} from "./library-view";
import { distinctGenres, filterByGenre, resolveGenre } from "./catalog-view";
import { joinList, splitList } from "./preferences-format";

const media = (id: string, genre = "Science Fiction"): MediaItem => ({
  id,
  type: "ebook",
  title: id,
  creator: "c",
  genre,
  language: "English",
  description: "",
  coverTheme: "teal",
});
const entry = (mediaItemId: string, status: LibraryEntry["status"]): LibraryEntry => ({
  id: `le-${mediaItemId}`,
  userId: "u",
  mediaItemId,
  status,
  rating: null,
  review: "",
  updatedAt: "2026-05-29T00:00:00.000Z",
});

describe("shelves view (DL-32)", () => {
  it("composes entries with media and drops unresolved ones", () => {
    const items = composeShelfItems([entry("a", "wishlist"), entry("missing", "current")], [media("a")]);
    expect(items).toHaveLength(1);
    expect(items[0]?.item.id).toBe("a");
  });

  it("filters by shelf and resolves unknown shelves to all", () => {
    const items = composeShelfItems([entry("a", "wishlist"), entry("b", "finished")], [media("a"), media("b")]);
    expect(filterShelfItems(items, "finished")).toHaveLength(1);
    expect(filterShelfItems(items, "all")).toHaveLength(2);
    expect(resolveShelf("nope")).toBe("all");
    expect(resolveShelf("finished")).toBe("finished");
  });

  it("filters shelf items by media type, passing through 'all' (DL-73)", () => {
    const items = composeShelfItems(
      [entry("a", "wishlist"), entry("b", "wishlist")],
      [{ ...media("a"), type: "ebook" }, { ...media("b"), type: "music" }],
    );
    expect(filterShelfItemsByType(items, "all")).toHaveLength(2);
    const music = filterShelfItemsByType(items, "music");
    expect(music).toHaveLength(1);
    expect(music[0]?.item.id).toBe("b");
  });

  it("scoped search filters by title or creator case-insensitively, composing with the type filter (DL-82)", () => {
    const items = composeShelfItems(
      [entry("circe", "wishlist"), entry("dune", "wishlist")],
      [
        { ...media("circe"), title: "Circe", creator: "Madeline Miller", type: "ebook" },
        { ...media("dune"), title: "Dune", creator: "Frank Herbert", type: "ebook" },
      ],
    );
    expect(filterShelfItemsByQuery(items, "").map((i) => i.item.id)).toEqual(["circe", "dune"]);
    expect(filterShelfItemsByQuery(items, "cir").map((i) => i.item.id)).toEqual(["circe"]);
    expect(filterShelfItemsByQuery(items, "herbert").map((i) => i.item.id)).toEqual(["dune"]); // creator match
    // Composes with the media-type filter.
    expect(filterShelfItemsByQuery(filterShelfItemsByType(items, "ebook"), "dune")).toHaveLength(1);
    expect(filterShelfItemsByQuery(items, "zzz")).toHaveLength(0);
  });
});

describe("catalog view (DL-33)", () => {
  it("derives sorted distinct genres and filters by genre", () => {
    const items = [media("a", "Memoir"), media("b", "Science Fiction"), media("c", "Memoir")];
    expect(distinctGenres(items)).toEqual(["Memoir", "Science Fiction"]);
    expect(filterByGenre(items, "Memoir")).toHaveLength(2);
    expect(resolveGenre("Memoir", ["Memoir"])).toBe("Memoir");
    expect(resolveGenre("Unknown", ["Memoir"])).toBe("all");
  });
});

describe("preferences formatting (DL-34)", () => {
  it("splits and joins comma-separated lists", () => {
    expect(splitList("Le Guin,  Kuang , ,Weir")).toEqual(["Le Guin", "Kuang", "Weir"]);
    expect(joinList(["Jazz", "Ambient"])).toBe("Jazz, Ambient");
  });
});

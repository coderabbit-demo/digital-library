import { describe, expect, it } from "vitest";
import { itemBackTarget } from "./item-nav";

describe("itemBackTarget (cover-art / trending)", () => {
  it("returns the Trending target when arriving from Trending", () => {
    expect(itemBackTarget("trending")).toEqual({ href: "/trending", label: "Trending" });
  });

  it("maps wishlist and reviews origins", () => {
    expect(itemBackTarget("wishlist")).toEqual({ href: "/wishlist", label: "Wishlist" });
    expect(itemBackTarget("reviews")).toEqual({ href: "/reviews", label: "Reviews" });
  });

  it("maps the Home origin (e.g. the home Trending section)", () => {
    expect(itemBackTarget("home")).toEqual({ href: "/", label: "Home" });
  });

  it("falls back to Library for unknown, missing, or prototype-key origins", () => {
    expect(itemBackTarget(undefined)).toEqual({ href: "/library", label: "Library" });
    expect(itemBackTarget("bogus")).toEqual({ href: "/library", label: "Library" });
    // Prototype keys must not resolve to a function/garbage target.
    expect(itemBackTarget("constructor")).toEqual({ href: "/library", label: "Library" });
    expect(itemBackTarget("toString")).toEqual({ href: "/library", label: "Library" });
  });

  it("preserves the origin's query/type so back-navigation keeps the results", () => {
    expect(itemBackTarget("search", { q: "dune" })).toEqual({
      href: "/search?q=dune",
      label: "Search",
    });
    expect(itemBackTarget("search", { q: "the matrix", type: "tv_movie" })).toEqual({
      href: "/search?q=the%20matrix&type=tv_movie",
      label: "Search",
    });
  });

  it("drops blank/absent preserved params and keeps a clean base href", () => {
    expect(itemBackTarget("search", { q: "", type: undefined })).toEqual({
      href: "/search",
      label: "Search",
    });
    expect(itemBackTarget("search", { q: "   " })).toEqual({ href: "/search", label: "Search" });
  });
});

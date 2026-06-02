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

  it("falls back to Library for unknown, missing, or prototype-key origins", () => {
    expect(itemBackTarget(undefined)).toEqual({ href: "/library", label: "Library" });
    expect(itemBackTarget("bogus")).toEqual({ href: "/library", label: "Library" });
    // Prototype keys must not resolve to a function/garbage target.
    expect(itemBackTarget("constructor")).toEqual({ href: "/library", label: "Library" });
    expect(itemBackTarget("toString")).toEqual({ href: "/library", label: "Library" });
  });
});

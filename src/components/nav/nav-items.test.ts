import { describe, expect, it } from "vitest";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";

describe("navigation model (DL-46)", () => {
  it("uses the reference IA plus Trending", () => {
    expect(NAV_ITEMS.map((i) => i.href)).toEqual([
      "/",
      "/library",
      "/wishlist",
      "/reviews",
      "/trending",
    ]);
    expect(NAV_ITEMS.map((i) => i.label)).toEqual([
      "Home",
      "Library",
      "Wishlist",
      "Reviews",
      "Trending",
    ]);
  });

  it("marks Home active only on the exact root path", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/library", "/")).toBe(false);
  });

  it("marks a section active on its path and nested paths", () => {
    expect(isNavItemActive("/library", "/library")).toBe(true);
    expect(isNavItemActive("/library/123", "/library")).toBe(true);
    expect(isNavItemActive("/wishlist", "/library")).toBe(false);
  });
});

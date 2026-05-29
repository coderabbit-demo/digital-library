import { describe, expect, it } from "vitest";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";

describe("navigation model (DL-28)", () => {
  it("includes Home, Shelves, Catalog, and Profile", () => {
    expect(NAV_ITEMS.map((i) => i.href)).toEqual(["/", "/shelves", "/catalog", "/profile"]);
  });

  it("marks Home active only on the exact root path", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/shelves", "/")).toBe(false);
  });

  it("marks a section active on its path and nested paths", () => {
    expect(isNavItemActive("/shelves", "/shelves")).toBe(true);
    expect(isNavItemActive("/shelves/123", "/shelves")).toBe(true);
    expect(isNavItemActive("/catalog", "/shelves")).toBe(false);
  });
});

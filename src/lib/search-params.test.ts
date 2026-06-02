import { describe, expect, it } from "vitest";
import { firstParam } from "./search-params";

describe("firstParam (DL-73)", () => {
  it("returns a single string value unchanged", () => {
    expect(firstParam("music")).toBe("music");
  });

  it("takes the first entry when Next.js gives a repeated param as an array", () => {
    expect(firstParam(["music", "ebook"])).toBe("music");
  });

  it("returns undefined for an empty array or a missing param", () => {
    expect(firstParam([])).toBeUndefined();
    expect(firstParam(undefined)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { MAX_TAGS, normalizeTags } from "./tags";

describe("normalizeTags (DL-42)", () => {
  it("trims, lowercases, and de-duplicates", () => {
    expect(normalizeTags([" Fiction ", "fiction", "PHILOSOPHY"])).toEqual(["fiction", "philosophy"]);
  });

  it("accepts a comma-separated string and drops empties", () => {
    expect(normalizeTags("sci-fi, , fantasy")).toEqual(["sci-fi", "fantasy"]);
  });

  it("ignores non-string input", () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags([1, "ok", null])).toEqual(["ok"]);
  });

  it("caps the number of tags", () => {
    const many = Array.from({ length: MAX_TAGS + 5 }, (_, i) => `tag${i}`);
    expect(normalizeTags(many)).toHaveLength(MAX_TAGS);
  });
});

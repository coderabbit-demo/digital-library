import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./queries";

describe("query helpers (DL-15)", () => {
  it("lowercases emails so reads and writes match", () => {
    expect(normalizeEmail("Ava@Example.com")).toBe("ava@example.com");
  });

  it("passes through null and undefined unchanged", () => {
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeUndefined();
  });
});

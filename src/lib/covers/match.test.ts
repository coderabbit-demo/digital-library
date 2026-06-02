import { describe, expect, it } from "vitest";
import { coverMatches } from "./match";

describe("coverMatches (cover-art DL-75)", () => {
  it("accepts an exact title + creator match", () => {
    expect(coverMatches({ title: "Circe", creator: "Madeline Miller" }, { title: "Circe", creator: "Madeline Miller" })).toBe(true);
  });

  it("normalizes case, punctuation, and diacritics", () => {
    expect(
      coverMatches(
        { title: "Café: A Novel", creator: "José Saramago" },
        { title: "cafe a novel", creator: "JOSE SARAMAGO" },
      ),
    ).toBe(true);
  });

  it("accepts when the candidate title contains the item title and creator corroborates", () => {
    expect(
      coverMatches(
        { title: "Circe", creator: "Madeline Miller" },
        { title: "Circe: A Novel", creator: "Madeline Miller" },
      ),
    ).toBe(true);
  });

  it("rejects a same-title hit by a different creator", () => {
    expect(
      coverMatches({ title: "Circe", creator: "Madeline Miller" }, { title: "Circe", creator: "Someone Else" }),
    ).toBe(false);
  });

  it("rejects an unrelated title", () => {
    expect(
      coverMatches({ title: "Circe", creator: "Madeline Miller" }, { title: "Dune", creator: "Madeline Miller" }),
    ).toBe(false);
  });

  it("requires a creator by default (missing candidate creator fails)", () => {
    expect(coverMatches({ title: "Circe", creator: "Madeline Miller" }, { title: "Circe" })).toBe(false);
  });

  it("allows a title-only match when creator is not required (podcasts)", () => {
    expect(
      coverMatches({ title: "99% Invisible", creator: "Roman Mars" }, { title: "99% Invisible" }, { requireCreator: false }),
    ).toBe(true);
  });

  it("still requires a title match even when creator is not required", () => {
    expect(
      coverMatches({ title: "99% Invisible", creator: "Roman Mars" }, { title: "Reply All" }, { requireCreator: false }),
    ).toBe(false);
  });
});

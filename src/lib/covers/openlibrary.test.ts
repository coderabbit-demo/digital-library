import { describe, expect, it, vi } from "vitest";
import { resolveOpenLibraryCover } from "./openlibrary";

function jsonFetch(payload: unknown, ok = true): typeof fetch {
  return vi.fn(async () => ({ ok, json: async () => payload }) as unknown as Response) as unknown as typeof fetch;
}

describe("resolveOpenLibraryCover (cover-art DL-75)", () => {
  it("queries by title and author and returns a by-cover-id https URL for a match", async () => {
    const fetchImpl = jsonFetch({
      docs: [{ cover_i: 240727, title: "Circe", author_name: ["Madeline Miller"] }],
    });
    const url = await resolveOpenLibraryCover("Circe", "Madeline Miller", { fetchImpl });
    expect(url).toBe("https://covers.openlibrary.org/b/id/240727-M.jpg");

    const called = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(called).toContain("title=Circe");
    expect(called).toContain("author=Madeline");
  });

  it("skips docs without a cover id and picks the first matching one", async () => {
    const fetchImpl = jsonFetch({
      docs: [
        { title: "Circe", author_name: ["Madeline Miller"] }, // no cover_i
        { cover_i: 99, title: "Circe", author_name: ["Madeline Miller"] },
      ],
    });
    expect(await resolveOpenLibraryCover("Circe", "Madeline Miller", { fetchImpl })).toBe(
      "https://covers.openlibrary.org/b/id/99-M.jpg",
    );
  });

  it("returns null when no doc matches the creator (match safety)", async () => {
    const fetchImpl = jsonFetch({ docs: [{ cover_i: 1, title: "Circe", author_name: ["Someone Else"] }] });
    expect(await resolveOpenLibraryCover("Circe", "Madeline Miller", { fetchImpl })).toBeNull();
  });

  it("returns null on a non-ok response, empty docs, or a thrown fetch", async () => {
    expect(await resolveOpenLibraryCover("X", "Y", { fetchImpl: jsonFetch({ docs: [] }) })).toBeNull();
    expect(await resolveOpenLibraryCover("X", "Y", { fetchImpl: jsonFetch({}, false) })).toBeNull();
    const throwing = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    expect(await resolveOpenLibraryCover("X", "Y", { fetchImpl: throwing })).toBeNull();
  });
});

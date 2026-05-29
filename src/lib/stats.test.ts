import { describe, expect, it } from "vitest";
import { computeUserStats } from "./stats";
import type { LibraryEntry } from "@/lib/types";

function entry(partial: Partial<LibraryEntry>): LibraryEntry {
  return {
    id: "e",
    userId: "u",
    mediaItemId: "m",
    status: "wishlist",
    rating: null,
    review: "",
    progress: null,
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...partial,
  };
}

describe("computeUserStats (DL-42)", () => {
  it("counts by status, totals pages, and counts rated as reviewed", () => {
    const stats = computeUserStats([
      entry({ status: "wishlist" }),
      entry({ status: "current", progress: 50 }),
      entry({ status: "finished", rating: 5, progress: 318 }),
      entry({ status: "finished", rating: null, progress: 0 }),
    ]);
    expect(stats.counts).toEqual({ wishlist: 1, current: 1, finished: 2, reviewed: 1 });
    expect(stats.totalPagesRead).toBe(368);
    expect(stats.inProgress).toBe(1);
  });

  it("is empty-safe", () => {
    expect(computeUserStats([])).toEqual({
      counts: { wishlist: 0, current: 0, finished: 0, reviewed: 0 },
      totalPagesRead: 0,
      inProgress: 0,
    });
  });
});

import { describe, expect, it } from "vitest";
import { computeStreaks } from "./streaks";

describe("computeStreaks (DL-42)", () => {
  it("is zero for no activity", () => {
    expect(computeStreaks([], "2026-05-29")).toEqual({ current: 0, longest: 0 });
  });

  it("counts the current run ending today and de-duplicates same-day activity", () => {
    const dates = [
      "2026-05-27T08:00:00Z",
      "2026-05-27T20:00:00Z",
      "2026-05-28T10:00:00Z",
      "2026-05-29T09:00:00Z",
    ];
    expect(computeStreaks(dates, "2026-05-29")).toEqual({ current: 3, longest: 3 });
  });

  it("allows yesterday to count as current but breaks on older gaps", () => {
    expect(computeStreaks(["2026-05-28"], "2026-05-29").current).toBe(1);
    expect(computeStreaks(["2026-05-26"], "2026-05-29").current).toBe(0);
  });

  it("reports the longest historical run even when not current", () => {
    const dates = ["2026-05-01", "2026-05-02", "2026-05-03", "2026-05-20"];
    expect(computeStreaks(dates, "2026-05-29")).toEqual({ current: 0, longest: 3 });
  });
});

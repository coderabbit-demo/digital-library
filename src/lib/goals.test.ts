import { describe, expect, it } from "vitest";
import { computeGoalProgress } from "./goals";
import type { Goal } from "@/lib/types";

const goal: Goal = {
  id: "g",
  userId: "u",
  period: "year",
  periodKey: "2026",
  targetCount: 24,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("computeGoalProgress (DL-42)", () => {
  it("returns null when no goal is set (Req 4.4)", () => {
    expect(computeGoalProgress(null, 3)).toBeNull();
  });

  it("computes completed and a non-negative remaining", () => {
    expect(computeGoalProgress(goal, 1)).toEqual({
      target: 24,
      completed: 1,
      remaining: 23,
      period: "year",
      periodKey: "2026",
    });
  });

  it("clamps remaining at zero when the goal is exceeded", () => {
    const progress = computeGoalProgress(goal, 30);
    expect(progress?.remaining).toBe(0);
    expect(progress?.completed).toBe(30);
  });
});

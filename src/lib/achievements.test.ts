import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_TOTAL,
  evaluateAchievements,
  newlyUnlockedKeys,
  unlockedCount,
  type AchievementContext,
} from "./achievements";

const ctx = (over: Partial<AchievementContext> = {}): AchievementContext => ({
  stats: { counts: { wishlist: 0, current: 0, finished: 1, reviewed: 1 }, totalPagesRead: 0, inProgress: 0 },
  streaks: { current: 0, longest: 0 },
  goalProgress: null,
  ...over,
});

describe("achievements (DL-42)", () => {
  it("marks satisfied definitions unlocked and reports an unlocked count", () => {
    const views = evaluateAchievements(ctx(), new Map());
    expect(views).toHaveLength(ACHIEVEMENT_TOTAL);
    const first = views.find((v) => v.key === "first_finish");
    expect(first?.unlocked).toBe(true);
    expect(unlockedCount(views)).toBe(2); // first_finish + first_review
  });

  it("treats persisted unlocks as unlocked and surfaces the achieved date", () => {
    const views = evaluateAchievements(ctx({ stats: { counts: { wishlist: 0, current: 0, finished: 0, reviewed: 0 }, totalPagesRead: 0, inProgress: 0 } }), new Map([["first_finish", "2026-05-01T00:00:00.000Z"]]));
    const first = views.find((v) => v.key === "first_finish");
    expect(first?.unlocked).toBe(true);
    expect(first?.achievedAt).toBe("2026-05-01T00:00:00.000Z");
  });

  it("reports only newly satisfied, not-yet-persisted keys", () => {
    const fresh = newlyUnlockedKeys(ctx(), new Set());
    expect(fresh).toContain("first_finish");
    expect(fresh).toContain("first_review");
    const afterPersist = newlyUnlockedKeys(ctx(), new Set(["first_finish", "first_review"]));
    expect(afterPersist).toEqual([]);
  });

  it("unlocks the goal achievement only when the goal is met", () => {
    const met = ctx({ goalProgress: { target: 5, completed: 5, remaining: 0, period: "year", periodKey: "2026" } });
    expect(newlyUnlockedKeys(met, new Set())).toContain("goal_achiever");
    const notMet = ctx({ goalProgress: { target: 5, completed: 2, remaining: 3, period: "year", periodKey: "2026" } });
    expect(newlyUnlockedKeys(notMet, new Set())).not.toContain("goal_achiever");
  });
});

/**
 * Achievements (media-platform-v2 Req 6). The definition catalog lives in code;
 * unlock state is persisted separately (a map of key -> achieved date is passed
 * in). Evaluation is pure: `evaluateAchievements` produces the view model and
 * `newlyUnlockedKeys` reports keys satisfied now but not yet persisted, so write
 * paths can record first unlocks idempotently.
 */
import type { GoalProgress } from "@/lib/goals";
import type { StreakInfo } from "@/lib/streaks";
import type { UserStats } from "@/lib/stats";

export interface AchievementContext {
  stats: UserStats;
  streaks: StreakInfo;
  goalProgress: GoalProgress | null;
}

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  predicate: (ctx: AchievementContext) => boolean;
  progress?: (ctx: AchievementContext) => { current: number; target: number };
}

export interface AchievementView {
  key: string;
  title: string;
  description: string;
  unlocked: boolean;
  achievedAt: string | null;
  progress: { current: number; target: number } | null;
}

const clampProgress = (current: number, target: number) => ({
  current: Math.min(current, target),
  target,
});

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    key: "first_finish",
    title: "First Finish",
    description: "Complete your first item.",
    predicate: (c) => c.stats.counts.finished >= 1,
    progress: (c) => clampProgress(c.stats.counts.finished, 1),
  },
  {
    key: "five_finishes",
    title: "Getting Through the Stack",
    description: "Complete five items.",
    predicate: (c) => c.stats.counts.finished >= 5,
    progress: (c) => clampProgress(c.stats.counts.finished, 5),
  },
  {
    key: "first_review",
    title: "Critic",
    description: "Rate your first item.",
    predicate: (c) => c.stats.counts.reviewed >= 1,
    progress: (c) => clampProgress(c.stats.counts.reviewed, 1),
  },
  {
    key: "prolific_reviewer",
    title: "Seasoned Critic",
    description: "Rate five items.",
    predicate: (c) => c.stats.counts.reviewed >= 5,
    progress: (c) => clampProgress(c.stats.counts.reviewed, 5),
  },
  {
    key: "streak_3",
    title: "On a Roll",
    description: "Reach a 3-day activity streak.",
    predicate: (c) => c.streaks.longest >= 3,
    progress: (c) => clampProgress(c.streaks.longest, 3),
  },
  {
    key: "streak_7",
    title: "Habit Formed",
    description: "Reach a 7-day activity streak.",
    predicate: (c) => c.streaks.longest >= 7,
    progress: (c) => clampProgress(c.streaks.longest, 7),
  },
  {
    key: "goal_achiever",
    title: "Goal Achiever",
    description: "Reach your reading goal.",
    predicate: (c) => c.goalProgress != null && c.goalProgress.completed >= c.goalProgress.target,
    progress: (c) =>
      c.goalProgress
        ? clampProgress(c.goalProgress.completed, c.goalProgress.target)
        : { current: 0, target: 1 },
  },
  {
    key: "bookworm",
    title: "Bookworm",
    description: "Read 1,000 pages.",
    predicate: (c) => c.stats.totalPagesRead >= 1000,
    progress: (c) => clampProgress(c.stats.totalPagesRead, 1000),
  },
];

export const ACHIEVEMENT_TOTAL = ACHIEVEMENTS.length;

/** Build the view model; an achievement is unlocked if persisted or satisfied now. */
export function evaluateAchievements(
  ctx: AchievementContext,
  unlockedAt: ReadonlyMap<string, string>,
): AchievementView[] {
  return ACHIEVEMENTS.map((def) => {
    const achievedAt = unlockedAt.get(def.key) ?? null;
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      unlocked: achievedAt !== null || def.predicate(ctx),
      achievedAt,
      progress: def.progress ? def.progress(ctx) : null,
    };
  });
}

/** Keys satisfied now but not already persisted — to record idempotently. */
export function newlyUnlockedKeys(
  ctx: AchievementContext,
  alreadyUnlocked: ReadonlySet<string>,
): string[] {
  return ACHIEVEMENTS.filter((def) => !alreadyUnlocked.has(def.key) && def.predicate(ctx)).map(
    (def) => def.key,
  );
}

export function unlockedCount(views: readonly AchievementView[]): number {
  return views.filter((v) => v.unlocked).length;
}

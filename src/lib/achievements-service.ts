/**
 * Server-side achievement evaluation (media-platform-v2 Req 6.2).
 *
 * Composes the DAL with the pure helpers to build a user's achievement context
 * and persist any newly satisfied unlocks idempotently. Called from write
 * handlers after a mutation; best-effort — callers swallow/log failures so an
 * unlock-bookkeeping error never fails the user's primary action.
 */
import type { DbExecutor } from "@/db/client";
import {
  countFinishedBetween,
  getActiveGoal,
  insertAchievementUnlocks,
  listActivityDatesForUser,
  listEntriesForUser,
  listUserAchievements,
} from "@/db/queries";
import { newlyUnlockedKeys, type AchievementContext } from "./achievements";
import { computeGoalProgress, DEFAULT_GOAL_PERIOD } from "./goals";
import { computeStreaks } from "./streaks";
import { computeUserStats } from "./stats";

function yearWindow(now: Date): { key: string; from: Date; to: Date } {
  const y = now.getUTCFullYear();
  return {
    key: String(y),
    from: new Date(Date.UTC(y, 0, 1)),
    to: new Date(Date.UTC(y + 1, 0, 1)),
  };
}

/** Build a user's achievement context from their own data (Req 3.4, 5.3). */
export async function buildAchievementContext(
  db: DbExecutor,
  userId: string,
  now: Date,
): Promise<AchievementContext> {
  const { key, from, to } = yearWindow(now);
  const [entries, goal, activityDates, finishedInPeriod] = await Promise.all([
    listEntriesForUser(db, userId),
    getActiveGoal(db, userId, DEFAULT_GOAL_PERIOD, key),
    listActivityDatesForUser(db, userId),
    countFinishedBetween(db, userId, from, to),
  ]);
  return {
    stats: computeUserStats(entries),
    streaks: computeStreaks(activityDates, now.toISOString()),
    goalProgress: computeGoalProgress(goal, finishedInPeriod),
  };
}

/** Persist any achievements the user newly satisfies (idempotent). */
export async function recordNewlyUnlocked(db: DbExecutor, userId: string, now: Date): Promise<void> {
  const [persisted, ctx] = await Promise.all([
    listUserAchievements(db, userId),
    buildAchievementContext(db, userId, now),
  ]);
  const keys = newlyUnlockedKeys(ctx, new Set(persisted.map((a) => a.achievementKey)));
  await insertAchievementUnlocks(db, userId, keys);
}

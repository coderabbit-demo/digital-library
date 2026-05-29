/**
 * Reading-goal progress (media-platform-v2 Req 4.2, 4.4). Pure: the caller
 * supplies the count of items finished within the goal's period.
 */
import type { Goal } from "@/lib/types";

export interface GoalProgress {
  target: number;
  completed: number;
  /** Items still needed to reach the target; never negative. */
  remaining: number;
  period: string;
  periodKey: string;
}

export const DEFAULT_GOAL_PERIOD = "year";

/** Returns null when no goal is set, so the UI can show a prompt (Req 4.4). */
export function computeGoalProgress(goal: Goal | null, finishedInPeriod: number): GoalProgress | null {
  if (!goal) return null;
  const completed = Math.max(0, finishedInPeriod);
  return {
    target: goal.targetCount,
    completed,
    remaining: Math.max(0, goal.targetCount - completed),
    period: goal.period,
    periodKey: goal.periodKey,
  };
}

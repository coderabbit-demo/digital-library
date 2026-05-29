import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { countFinishedBetween, getActiveGoal, upsertGoal } from "@/db/queries";
import { recordNewlyUnlocked } from "@/lib/achievements-service";
import { computeGoalProgress, DEFAULT_GOAL_PERIOD } from "@/lib/goals";
import { getSessionUser } from "@/lib/auth/current-user";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { validateGoal } from "@/lib/api/validation";
import type { ApiError, GoalResponse } from "@/lib/types";
import type { DbExecutor } from "@/db/client";

export const runtime = "nodejs";

function currentYearKey(): string {
  return String(new Date().getUTCFullYear());
}

/** Year window [Jan 1, next Jan 1) for the given year key. */
function yearWindow(periodKey: string): { from: Date; to: Date } {
  const y = Number(periodKey);
  const year = Number.isInteger(y) ? y : new Date().getUTCFullYear();
  return { from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year + 1, 0, 1)) };
}

async function progressFor(
  db: DbExecutor,
  userId: string,
  period: string,
  periodKey: string,
): Promise<GoalResponse> {
  const goal = await getActiveGoal(db, userId, period, periodKey);
  if (!goal) return { goal: null, progress: null };
  const { from, to } = yearWindow(periodKey);
  const finished = await countFinishedBetween(db, userId, from, to);
  return { goal, progress: computeGoalProgress(goal, finished) };
}

/** Read the active goal and its progress (Req 4.1, 4.2). */
export async function GET(request: Request): Promise<NextResponse<GoalResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const params = new URL(request.url).searchParams;
  const period = (params.get("period") ?? DEFAULT_GOAL_PERIOD).trim() || DEFAULT_GOAL_PERIOD;
  const periodKey = (params.get("key") ?? "").trim() || currentYearKey();

  try {
    return NextResponse.json(await progressFor(getDb(), user.id, period, periodKey));
  } catch {
    return serverError();
  }
}

/** Set the active goal and return its recomputed progress (Req 4.3). */
export async function PUT(request: Request): Promise<NextResponse<GoalResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }
  const input = validateGoal(body);
  if (!input) return badRequest("A target count of at least 1 is required.");

  const periodKey = input.periodKey ?? currentYearKey();
  try {
    const db = getDb();
    await upsertGoal(db, {
      userId: user.id,
      period: input.period,
      periodKey,
      targetCount: input.targetCount,
    });
    const result = await progressFor(db, user.id, input.period, periodKey);
    try {
      await recordNewlyUnlocked(db, user.id, new Date());
    } catch (error) {
      console.error("achievement unlock recording failed:", error);
    }
    return NextResponse.json(result);
  } catch {
    return serverError();
  }
}

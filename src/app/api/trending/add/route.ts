import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { recordNewlyUnlocked } from "@/lib/achievements-service";
import { getSessionUser } from "@/lib/auth/current-user";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { validateAddTrending } from "@/lib/api/validation";
import { addTrendingItem } from "@/lib/trending/add";
import type { AddTrendingResponse, ApiError } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Add a trending item to the signed-in user's library (trending-now DL-57).
 * De-dupes against existing media (type + title + creator); records an activity
 * so it shows in the Home feed; reports whether the media was created and
 * whether the user already owned it.
 */
export async function POST(request: Request): Promise<NextResponse<AddTrendingResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }
  const input = validateAddTrending(body);
  if (!input) return badRequest("A title and creator are required.");

  try {
    const db = getDb();
    const result = await db.transaction((tx) => addTrendingItem(tx, user.id, input, new Date()));

    // Best-effort: adding/finishing may unlock achievements; never fail the add.
    try {
      await recordNewlyUnlocked(db, user.id, new Date());
    } catch (error) {
      console.error("achievement unlock recording failed:", error);
    }
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch {
    return serverError();
  }
}

import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { updateEntryProgress } from "@/db/queries";
import { recordNewlyUnlocked } from "@/lib/achievements-service";
import { getSessionUser } from "@/lib/auth/current-user";
import { apiError, badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { validateProgress } from "@/lib/api/validation";
import type { ApiError, LibraryEntryResponse } from "@/lib/types";

export const runtime = "nodejs";

/** Record consumption progress for the user's own entry (Req 3.1, 14.3). */
export async function PATCH(
  request: Request,
): Promise<NextResponse<LibraryEntryResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }
  const input = validateProgress(body);
  if (!input) return badRequest("An entry id and a non-negative progress value are required.");

  try {
    const db = getDb();
    const entry = await updateEntryProgress(db, {
      entryId: input.entryId,
      userId: user.id,
      progress: input.progress,
      updatedAt: new Date(),
    });
    if (!entry) return apiError(404, "Library entry not found.");

    // Best-effort: pages read may unlock achievements; never fail the write.
    try {
      await recordNewlyUnlocked(db, user.id, new Date());
    } catch (error) {
      console.error("achievement unlock recording failed:", error);
    }
    return NextResponse.json({ entry });
  } catch {
    return serverError();
  }
}

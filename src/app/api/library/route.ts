import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { findEntry, findMediaById, insertActivity, upsertEntryStatus } from "@/db/queries";
import { actionForStatus, detailForStatus } from "@/lib/activity";
import { recordNewlyUnlocked } from "@/lib/achievements-service";
import { getSessionUser } from "@/lib/auth/current-user";
import { apiError, badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { validateLibraryUpsert } from "@/lib/api/validation";
import type { ApiError, LibraryEntryResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse<LibraryEntryResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }
  const input = validateLibraryUpsert(body);
  if (!input) return badRequest("A media item id and a valid shelf are required.");

  try {
    const db = getDb();
    const media = await findMediaById(db, input.mediaItemId);
    if (!media) return apiError(404, "Unknown media item.");

    // Upsert the shelf and record the activity atomically.
    const entry = await db.transaction(async (tx) => {
      const existing = await findEntry(tx, user.id, input.mediaItemId);
      const saved = await upsertEntryStatus(tx, {
        userId: user.id,
        mediaItemId: input.mediaItemId,
        status: input.status,
        updatedAt: new Date(),
      });
      await insertActivity(tx, {
        userId: user.id,
        mediaItemId: input.mediaItemId,
        action: actionForStatus(input.status),
        detail: detailForStatus(input.status, Boolean(existing)),
        createdAt: new Date(),
      });
      return saved;
    });

    // Best-effort: moving to a shelf (e.g. finishing) may unlock achievements.
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

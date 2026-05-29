import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { insertActivity, saveReview } from "@/db/queries";
import { reviewDetail } from "@/lib/activity";
import { recordNewlyUnlocked } from "@/lib/achievements-service";
import { getSessionUser } from "@/lib/auth/current-user";
import { apiError, badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { validateReview } from "@/lib/api/validation";
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
  const input = validateReview(body);
  if (!input) return badRequest("An entry id and a 1–5 rating are required.");

  try {
    const db = getDb();
    // saveReview filters by entry id AND user id, so a foreign/unknown entry
    // yields null (per-user authorization, Req 9.7). Pair the review write and
    // the activity insert in a transaction so they commit together.
    const entry = await db.transaction(async (tx) => {
      const saved = await saveReview(tx, {
        entryId: input.entryId,
        userId: user.id,
        rating: input.rating,
        review: input.review,
        updatedAt: new Date(),
      });
      if (!saved) return null;
      await insertActivity(tx, {
        userId: user.id,
        mediaItemId: saved.mediaItemId,
        action: "reviewed",
        detail: reviewDetail(input.rating),
        createdAt: new Date(),
      });
      return saved;
    });
    if (!entry) return apiError(404, "Library entry not found.");

    // Best-effort: a review may unlock achievements; never fail the write.
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

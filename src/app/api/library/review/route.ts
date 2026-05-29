import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { insertActivity, saveReview } from "@/db/queries";
import { reviewDetail } from "@/lib/activity";
import { getSessionUser } from "@/lib/auth/current-user";
import { apiError, badRequest, unauthorized } from "@/lib/api/responses";
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

  const db = getDb();
  // saveReview filters by entry id AND user id, so a foreign entry returns null
  // (per-user authorization, Req 9.7).
  const entry = await saveReview(db, {
    entryId: input.entryId,
    userId: user.id,
    rating: input.rating,
    review: input.review,
    updatedAt: new Date(),
  });
  if (!entry) return apiError(404, "Library entry not found.");

  await insertActivity(db, {
    userId: user.id,
    mediaItemId: entry.mediaItemId,
    action: "reviewed",
    detail: reviewDetail(input.rating),
    createdAt: new Date(),
  });
  return NextResponse.json({ entry });
}

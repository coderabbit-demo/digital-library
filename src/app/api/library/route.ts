import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { findEntry, findMediaById, insertActivity, upsertEntryStatus } from "@/db/queries";
import { actionForStatus, detailForStatus } from "@/lib/activity";
import { getSessionUser } from "@/lib/auth/current-user";
import { apiError, badRequest, unauthorized } from "@/lib/api/responses";
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

  const db = getDb();
  const media = await findMediaById(db, input.mediaItemId);
  if (!media) return apiError(404, "Unknown media item.");

  const existing = await findEntry(db, user.id, input.mediaItemId);
  const entry = await upsertEntryStatus(db, {
    userId: user.id,
    mediaItemId: input.mediaItemId,
    status: input.status,
    updatedAt: new Date(),
  });
  await insertActivity(db, {
    userId: user.id,
    mediaItemId: input.mediaItemId,
    action: actionForStatus(input.status),
    detail: detailForStatus(input.status, Boolean(existing)),
    createdAt: new Date(),
  });
  return NextResponse.json({ entry });
}

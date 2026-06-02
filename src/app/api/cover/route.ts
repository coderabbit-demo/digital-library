import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getSessionUser } from "@/lib/auth/current-user";
import { apiError, badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { resolveAndPersistCover } from "@/lib/covers/service";
import type { ApiError } from "@/lib/types";

export const runtime = "nodejs";

interface CoverResponse {
  artworkUrl: string | null;
}

/**
 * Resolve and persist a media item's cover on demand (cover-art DL-75). Thin
 * wrapper: authenticate, read the id, delegate to the idempotent service (which
 * skips items already resolved/checked, returns null gracefully on a source
 * failure, and never refetches). A resolver failure is not a server error.
 */
export async function POST(request: Request): Promise<NextResponse<CoverResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }
  const mediaItemId =
    body && typeof body === "object" && typeof (body as { mediaItemId?: unknown }).mediaItemId === "string"
      ? (body as { mediaItemId: string }).mediaItemId
      : null;
  if (!mediaItemId) return badRequest("A mediaItemId is required.");

  try {
    const outcome = await resolveAndPersistCover(getDb(), mediaItemId);
    if (outcome.status === "not_found") return apiError(404, "Media item not found.");
    return NextResponse.json({ artworkUrl: outcome.artworkUrl });
  } catch {
    return serverError();
  }
}

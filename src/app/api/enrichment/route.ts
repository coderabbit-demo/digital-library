import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getSessionUser } from "@/lib/auth/current-user";
import { apiError, badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { resolveAndPersistEnrichment } from "@/lib/enrichment/service";
import type { ApiError, MediaEnrichment } from "@/lib/types";

export const runtime = "nodejs";

interface EnrichmentResponse {
  enrichment: MediaEnrichment | null;
}

/**
 * Resolve and persist a media item's enrichment on demand (media-detail-
 * enrichment Req 2.1, 7.2, 7.3). Thin wrapper: authenticate, read the id,
 * delegate to the idempotent service (which skips already-checked items, returns
 * null gracefully on a source failure, and never refetches). A provider failure
 * is not a server error.
 */
export async function POST(request: Request): Promise<NextResponse<EnrichmentResponse | ApiError>> {
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
    const outcome = await resolveAndPersistEnrichment(getDb(), mediaItemId);
    if (outcome.status === "not_found") return apiError(404, "Media item not found.");
    return NextResponse.json({ enrichment: outcome.enrichment });
  } catch {
    return serverError();
  }
}

import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getSessionUser } from "@/lib/auth/current-user";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { validateAddTrending } from "@/lib/api/validation";
import { resolveTrendingMedia } from "@/lib/trending/add";
import type { ApiError } from "@/lib/types";

export const runtime = "nodejs";

interface ResolveResponse {
  id: string;
}

/**
 * Resolve a trending (external) item to a catalog media id (media-detail DL-67)
 * so the client can open /item/[id]. Find-or-creates the media row only — no
 * library entry — and returns its id. Reuses the add validator for the payload.
 */
export async function POST(request: Request): Promise<NextResponse<ResolveResponse | ApiError>> {
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
    const { id } = await getDb().transaction((tx) =>
      resolveTrendingMedia(tx, {
        type: input.type,
        title: input.title,
        creator: input.creator,
        genre: input.genre,
        metadata: input.metadata,
        artworkUrl: input.artworkUrl,
      }),
    );
    return NextResponse.json({ id });
  } catch {
    return serverError();
  }
}

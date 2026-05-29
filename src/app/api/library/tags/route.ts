import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { setEntryTags } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { apiError, badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { validateTags } from "@/lib/api/validation";
import type { ApiError, TagsResponse } from "@/lib/types";

export const runtime = "nodejs";

/** Replace a library entry's tags (media-platform-v2 Req 2.3, 14.3). */
export async function POST(request: Request): Promise<NextResponse<TagsResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }
  const input = validateTags(body);
  if (!input) return badRequest("An entry id is required.");

  try {
    // Ownership check + delete + insert run together; null means the entry is
    // not the acting user's (per-user authorization).
    const tags = await getDb().transaction((tx) =>
      setEntryTags(tx, { entryId: input.entryId, userId: user.id, tags: input.tags }),
    );
    if (tags === null) return apiError(404, "Library entry not found.");
    return NextResponse.json({ entryId: input.entryId, tags });
  } catch {
    return serverError();
  }
}

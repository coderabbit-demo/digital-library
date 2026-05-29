import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { insertActivity, insertMediaItem, listMedia, upsertEntryStatus } from "@/db/queries";
import { actionForStatus, detailForStatus } from "@/lib/activity";
import { getSessionUser } from "@/lib/auth/current-user";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { parseTypeFilter, validateCustomMedia } from "@/lib/api/validation";
import type { ApiError, MediaCreateResponse, MediaListResponse } from "@/lib/types";

export const runtime = "nodejs";

const COVER_THEMES = ["teal", "gold", "coral", "green", "violet", "navy", "crimson"];

function pickCoverTheme(seed: string): string {
  let sum = 0;
  for (const ch of seed) sum += ch.charCodeAt(0);
  return COVER_THEMES[sum % COVER_THEMES.length] ?? "teal";
}

export async function GET(request: Request): Promise<NextResponse<MediaListResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const type = parseTypeFilter(new URL(request.url).searchParams.get("type"));
  try {
    const items = await listMedia(getDb(), type);
    return NextResponse.json({ items });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request): Promise<NextResponse<MediaCreateResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }
  const input = validateCustomMedia(body);
  if (!input) return badRequest("Title, creator, genre, and a valid shelf are required.");

  try {
    // Create the media item, the user's library entry, and the activity atomically.
    const result = await getDb().transaction(async (tx) => {
      const item = await insertMediaItem(tx, {
        type: "ebook",
        title: input.title,
        creator: input.creator,
        genre: input.genre,
        language: input.language,
        description: input.description || "A custom e-book added to this account.",
        coverTheme: pickCoverTheme(`${input.title}-${input.creator}`),
      });
      const entry = await upsertEntryStatus(tx, {
        userId: user.id,
        mediaItemId: item.id,
        status: input.status,
        updatedAt: new Date(),
      });
      await insertActivity(tx, {
        userId: user.id,
        mediaItemId: item.id,
        action: actionForStatus(input.status),
        detail: detailForStatus(input.status, false),
        createdAt: new Date(),
      });
      return { item, entry };
    });
    return NextResponse.json(result, { status: 201 });
  } catch {
    return serverError();
  }
}

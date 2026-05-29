import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { insertActivity, insertMediaItem, listMedia, upsertEntryStatus } from "@/db/queries";
import { actionForStatus, detailForStatus } from "@/lib/activity";
import { getSessionUser } from "@/lib/auth/current-user";
import { badRequest, unauthorized } from "@/lib/api/responses";
import { validateCustomMedia } from "@/lib/api/validation";
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
  const type = new URL(request.url).searchParams.get("type") ?? undefined;
  const items = await listMedia(getDb(), type ?? undefined);
  return NextResponse.json({ items });
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

  const db = getDb();
  const item = await insertMediaItem(db, {
    type: "ebook",
    title: input.title,
    creator: input.creator,
    genre: input.genre,
    language: input.language,
    description: input.description || "A custom e-book added to this account.",
    coverTheme: pickCoverTheme(`${input.title}-${input.creator}`),
  });
  const entry = await upsertEntryStatus(db, {
    userId: user.id,
    mediaItemId: item.id,
    status: input.status,
    updatedAt: new Date(),
  });
  await insertActivity(db, {
    userId: user.id,
    mediaItemId: item.id,
    action: actionForStatus(input.status),
    detail: detailForStatus(input.status, false),
    createdAt: new Date(),
  });
  return NextResponse.json({ item, entry }, { status: 201 });
}

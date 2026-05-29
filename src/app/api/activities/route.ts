import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { listFeed } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { unauthorized } from "@/lib/api/responses";
import type { ActivitiesResponse, ApiError } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse<ActivitiesResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const type = new URL(request.url).searchParams.get("type");
  const entries = await listFeed(getDb(), type && type !== "all" ? { type } : {});
  return NextResponse.json({ entries });
}

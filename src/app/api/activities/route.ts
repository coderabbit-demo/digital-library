import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { listFeed } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { serverError, unauthorized } from "@/lib/api/responses";
import { parseTypeFilter } from "@/lib/api/validation";
import type { ActivitiesResponse, ApiError } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse<ActivitiesResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const type = parseTypeFilter(new URL(request.url).searchParams.get("type"));
  try {
    const entries = await listFeed(getDb(), type ? { type } : {});
    return NextResponse.json({ entries });
  } catch {
    return serverError();
  }
}

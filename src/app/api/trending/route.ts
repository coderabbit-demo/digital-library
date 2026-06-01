import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { serverError, unauthorized } from "@/lib/api/responses";
import { fetchTrendingFeed } from "@/lib/trending/feed";
import type { ApiError, TrendingResponse } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Trending fan-out (trending-now DL-56). Authenticated; returns a per-source
 * envelope so the client can render healthy sources and mark failing ones.
 * Optional `?source=` filters to one provider; `?limit=` bounds items per source
 * (compact for the Home section).
 */
export async function GET(request: Request): Promise<NextResponse<TrendingResponse | ApiError>> {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const params = new URL(request.url).searchParams;
  const source = params.get("source")?.trim() || undefined;
  const limitRaw = Number(params.get("limit"));
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : undefined;

  try {
    return NextResponse.json(await fetchTrendingFeed({ limit, source }));
  } catch {
    return serverError();
  }
}

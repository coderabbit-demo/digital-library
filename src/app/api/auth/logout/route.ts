import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { clearSessionCookie, readSessionCookie } from "@/lib/auth/cookie";
import { revokeSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse<{ ok: true }>> {
  const token = await readSessionCookie();
  // Delete the session server-side so the token can't be replayed, then clear
  // the cookie. Idempotent: a missing/unknown token is a no-op.
  await revokeSession(getDb(), token);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

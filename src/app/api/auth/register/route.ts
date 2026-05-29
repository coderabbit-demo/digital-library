import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { setSessionCookie } from "@/lib/auth/cookie";
import { registerMember, validateRegistration } from "@/lib/auth/service";
import { createSession } from "@/lib/auth/session";
import type { ApiError, AuthResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse<AuthResponse | ApiError>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 400, message: "Invalid request body." }, { status: 400 });
  }

  const input = validateRegistration(body as Record<string, unknown>);
  if (!input) {
    return NextResponse.json(
      { status: 400, message: "Name, email, and password are required." },
      { status: 400 },
    );
  }

  const db = getDb();
  const result = await registerMember(db, input);
  if (!result.ok) {
    return NextResponse.json(
      { status: 409, message: "An account already exists for that email." },
      { status: 409 },
    );
  }

  const { token, expiresAt } = await createSession(db, result.user.id);
  await setSessionCookie(token, expiresAt);
  return NextResponse.json({ user: result.user }, { status: 201 });
}

import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { setSessionCookie } from "@/lib/auth/cookie";
import { loginMember, validateLogin } from "@/lib/auth/service";
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

  const input = validateLogin(body as Record<string, unknown>);
  if (!input) {
    return NextResponse.json(
      { status: 400, message: "Email and password are required." },
      { status: 400 },
    );
  }

  const db = getDb();
  const user = await loginMember(db, input);
  if (!user) {
    // Generic message — do not reveal whether the email exists.
    return NextResponse.json(
      { status: 401, message: "Email or password does not match." },
      { status: 401 },
    );
  }

  const { token, expiresAt } = await createSession(db, user.id);
  await setSessionCookie(token, expiresAt);
  return NextResponse.json({ user }, { status: 200 });
}

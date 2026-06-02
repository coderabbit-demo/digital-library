import { NextResponse } from "next/server";
import { buildAuthUrl, createOAuthStart, googleConfig } from "@/lib/auth/google";
import { encodeOAuthState, OAUTH_STATE_COOKIE, OAUTH_STATE_TTL_SECONDS } from "@/lib/auth/oauth-state";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Begin "Continue with Google" (google-auth DL-80): create the anti-forgery
 * state + PKCE material, stash it in a short-lived signed HttpOnly cookie, and
 * redirect to Google's consent screen. Declines (back to login) when Google is
 * not configured. Public route (excluded from session gating).
 */
export function GET(request: Request): NextResponse {
  const config = googleConfig();
  if (!config) return NextResponse.redirect(new URL("/login", request.url));

  const start = createOAuthStart();
  const response = NextResponse.redirect(buildAuthUrl(config, start));
  response.cookies.set(OAUTH_STATE_COOKIE, encodeOAuthState(start, serverEnv().AUTH_SECRET), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });
  return response;
}

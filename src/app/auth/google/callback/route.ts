import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { sessionCookieOptions } from "@/lib/auth/cookie";
import { exchangeCode, googleConfig, verifyIdToken } from "@/lib/auth/google";
import { decodeOAuthState, OAUTH_STATE_COOKIE } from "@/lib/auth/oauth-state";
import { resolveGoogleUser } from "@/lib/auth/service";
import { createSession } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

const isProduction = (): boolean => process.env.NODE_ENV === "production";

/** Coarse failure reason for diagnosability (never includes secrets/tokens). */
type FailureReason = "config" | "params" | "state" | "exchange_or_verify" | "session";

/** Back to the login surface with a recoverable error, clearing the state cookie. */
function loginError(request: NextRequest, reason: FailureReason): NextResponse {
  console.error(`google callback failed: ${reason}`);
  const response = NextResponse.redirect(new URL("/login?error=google", request.url));
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

/**
 * Google OAuth callback (google-auth DL-80): verify the anti-forgery state,
 * exchange the code server-side, validate the ID token, resolve (or create) the
 * user, and issue the platform's normal session — clearing the state cookie. Any
 * failure (denied consent, bad state, invalid token, error) returns to login
 * with no session and no partial account.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const config = googleConfig();
  if (!config) return NextResponse.redirect(new URL("/login", request.url));

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return loginError(request, "params");
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return loginError(request, "params");

  const stored = decodeOAuthState(request.cookies.get(OAUTH_STATE_COOKIE)?.value, serverEnv().AUTH_SECRET);
  if (!stored || stored.state !== state) return loginError(request, "state");

  let profile;
  try {
    const { idToken } = await exchangeCode(config, code, stored.codeVerifier);
    profile = verifyIdToken(idToken, config, stored.nonce);
  } catch {
    return loginError(request, "exchange_or_verify");
  }
  if (!profile) return loginError(request, "exchange_or_verify");

  try {
    const db = getDb();
    const user = await resolveGoogleUser(db, profile);
    const { token, expiresAt } = await createSession(db, user.id);

    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt, isProduction()));
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch {
    return loginError(request, "session");
  }
}

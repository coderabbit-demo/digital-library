/**
 * Route gating (DL-21). A coarse, edge-safe guard: signed-in routes require a
 * session cookie, and unauthenticated requests are redirected to /login. This
 * imports only the cookie name (no DB/Node modules) so it stays edge-compatible;
 * the authoritative session check runs server-side via getSessionUser().
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export function middleware(request: NextRequest): NextResponse {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (hasSession) return NextResponse.next();

  // Preserve the originally-requested path and query so login can return there.
  // (The fragment/hash is never sent to the server, so it cannot be preserved.)
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Protect everything except the auth pages, the auth API, the Google OAuth
  // routes (/auth/google/*), and framework/static assets.
  matcher: ["/((?!login|register|api|auth|_next/static|_next/image|favicon.ico).*)"],
};

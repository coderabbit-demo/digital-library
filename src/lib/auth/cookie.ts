/**
 * Session cookie read/write helpers (DL-19/DL-20). The cookie is HTTP-only and
 * SameSite=Lax; Secure in production. The token is never exposed to client JS.
 */
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  expires: Date;
}

/** Pure builder so cookie attributes are unit-testable. */
export function sessionCookieOptions(expires: Date, isProduction: boolean): SessionCookieOptions {
  return { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", expires };
}

const isProduction = (): boolean => process.env.NODE_ENV === "production";

export async function setSessionCookie(token: string, expires: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expires, isProduction()));
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}

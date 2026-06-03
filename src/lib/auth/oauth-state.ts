/**
 * Signed OAuth state for the Google sign-in flow (google-auth DL-80).
 *
 * The `start` route stashes `{ state, codeVerifier, nonce }` in a short-lived
 * HttpOnly cookie; the `callback` route reads it to compare `state` (anti-CSRF),
 * recover the PKCE verifier, and check the `nonce`. The cookie value is signed
 * with the app secret (HMAC-SHA256) so it cannot be forged or tampered with.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { OAuthStart } from "./google";

export const OAUTH_STATE_COOKIE = "ll_oauth";
/** Sign-in must complete within this window. */
export const OAUTH_STATE_TTL_SECONDS = 600;

export interface OAuthStatePayload {
  state: string;
  codeVerifier: string;
  nonce: string;
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function encodeOAuthState(start: OAuthStart, secret: string): string {
  const payload: OAuthStatePayload = {
    state: start.state,
    codeVerifier: start.codeVerifier,
    nonce: start.nonce,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data, secret)}`;
}

/** Verify the signature and parse the payload; null if absent/tampered/malformed. */
export function decodeOAuthState(value: string | undefined, secret: string): OAuthStatePayload | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const data = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  const expected = sign(data, secret);
  const macBuf = Buffer.from(mac);
  const expBuf = Buffer.from(expected);
  if (macBuf.length !== expBuf.length || !timingSafeEqual(macBuf, expBuf)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as OAuthStatePayload).state === "string" &&
      typeof (parsed as OAuthStatePayload).codeVerifier === "string" &&
      typeof (parsed as OAuthStatePayload).nonce === "string"
    ) {
      return parsed as OAuthStatePayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Google OIDC authorization-code (PKCE) client (google-auth DL-80).
 *
 * Keeps the platform's bespoke session model: this module only handles the
 * OAuth exchange and ID-token validation; the route handlers issue the normal
 * session. Secrets are read from the environment server-side and never sent to
 * the browser. Pure helpers + an injectable fetch make it unit-testable without
 * contacting Google.
 */
import { createHash, randomBytes } from "node:crypto";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SCOPE = "openid email profile";
const VALID_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}

/** Anti-forgery + PKCE material for one sign-in attempt. */
export interface OAuthStart {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  nonce: string;
}

function httpsOrNull(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Google credentials from the environment, or null when not fully configured. */
export function googleConfig(env: Record<string, string | undefined> = process.env): GoogleConfig | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = env.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function isGoogleConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return googleConfig(env) !== null;
}

export function createOAuthStart(): OAuthStart {
  const codeVerifier = randomBytes(48).toString("base64url");
  return {
    state: randomBytes(16).toString("base64url"),
    codeVerifier,
    codeChallenge: createHash("sha256").update(codeVerifier).digest("base64url"),
    nonce: randomBytes(16).toString("base64url"),
  };
}

export function buildAuthUrl(config: GoogleConfig, start: OAuthStart): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: SCOPE,
    state: start.state,
    nonce: start.nonce,
    code_challenge: start.codeChallenge,
    code_challenge_method: "S256",
    access_type: "online",
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** Exchange the authorization code at the token endpoint (server-side). */
export async function exchangeCode(
  config: GoogleConfig,
  code: string,
  codeVerifier: string,
  deps: { fetchImpl?: typeof fetch } = {},
): Promise<{ idToken: string }> {
  const doFetch = deps.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });
  const res = await doFetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: body.toString(),
    // Bound the exchange so a hung token endpoint can't stall the callback.
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  const data = (await res.json()) as unknown;
  const idToken = isRecord(data) && typeof data.id_token === "string" ? data.id_token : null;
  if (!idToken) throw new Error("Google token response missing id_token");
  return { idToken };
}

/**
 * Validate the ID token and return the normalized profile, or null if invalid.
 *
 * Signature verification is intentionally omitted: the token is obtained
 * directly from Google's token endpoint over the server-to-server TLS exchange
 * in `exchangeCode`, where Google's own guidance states signature validation is
 * not required (https://developers.google.com/identity/openid-connect/openid-connect#obtainuserinfo).
 * We still validate the security-relevant claims — issuer, audience, expiry, the
 * request-bound nonce, and email_verified — before trusting the identity.
 */
export function verifyIdToken(idToken: string, config: GoogleConfig, expectedNonce: string): GoogleProfile | null {
  const payload = decodeJwtPayload(idToken);
  if (!payload) return null;

  const iss = typeof payload.iss === "string" ? payload.iss : "";
  const aud = typeof payload.aud === "string" ? payload.aud : "";
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  const nonce = typeof payload.nonce === "string" ? payload.nonce : "";
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : "";
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";

  if (!VALID_ISSUERS.has(iss)) return null;
  if (aud !== config.clientId) return null;
  if (exp <= Math.floor(Date.now() / 1000)) return null;
  if (nonce !== expectedNonce) return null;
  if (!sub || !email || !emailVerified) return null;

  return {
    sub,
    email,
    emailVerified: true,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email,
    picture: httpsOrNull(payload.picture),
  };
}

function decodeJwtPayload(idToken: string): Record<string, unknown> | null {
  const parts = idToken.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

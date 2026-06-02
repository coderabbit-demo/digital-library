import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  buildAuthUrl,
  createOAuthStart,
  exchangeCode,
  googleConfig,
  isGoogleConfigured,
  verifyIdToken,
  type GoogleConfig,
} from "./google";

const config: GoogleConfig = {
  clientId: "client-123",
  clientSecret: "secret-xyz",
  redirectUri: "http://localhost:8000/auth/google/callback",
};

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function makeIdToken(payload: Record<string, unknown>): string {
  return `${b64url({ alg: "RS256" })}.${b64url(payload)}.sig`;
}
const validClaims = (over: Record<string, unknown> = {}) => ({
  iss: "https://accounts.google.com",
  aud: "client-123",
  exp: Math.floor(Date.now() / 1000) + 3600,
  sub: "google-sub-1",
  email: "ava@example.com",
  email_verified: true,
  name: "Ava Patel",
  picture: "https://lh3.googleusercontent.com/a/ava.jpg",
  nonce: "nonce-1",
  ...over,
});

describe("google config", () => {
  it("is configured only when id, secret, and redirect URI are all present", () => {
    expect(isGoogleConfigured({})).toBe(false);
    expect(isGoogleConfigured({ GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b" })).toBe(false);
    const env = { GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b", GOOGLE_REDIRECT_URI: "https://x/cb" };
    expect(isGoogleConfigured(env)).toBe(true);
    expect(googleConfig(env)).toEqual({ clientId: "a", clientSecret: "b", redirectUri: "https://x/cb" });
  });
});

describe("OAuth start + auth URL", () => {
  it("derives a valid PKCE challenge and distinct material", () => {
    const start = createOAuthStart();
    expect(start.state.length).toBeGreaterThanOrEqual(16);
    expect(start.nonce.length).toBeGreaterThanOrEqual(16);
    expect(start.codeChallenge).toBe(createHash("sha256").update(start.codeVerifier).digest("base64url"));
  });

  it("builds the consent URL with the required params", () => {
    const start = createOAuthStart();
    const url = new URL(buildAuthUrl(config, start));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe(start.codeChallenge);
    expect(url.searchParams.get("state")).toBe(start.state);
    expect(url.searchParams.get("nonce")).toBe(start.nonce);
  });
});

describe("exchangeCode", () => {
  it("posts code + verifier to the token endpoint and returns the id_token", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ id_token: "ID" }) }) as unknown as Response) as unknown as typeof fetch;
    const res = await exchangeCode(config, "auth-code", "verifier-1", { fetchImpl });
    expect(res.idToken).toBe("ID");
    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(call[0])).toBe("https://oauth2.googleapis.com/token");
    expect(String((call[1] as RequestInit).body)).toContain("code=auth-code");
    expect(String((call[1] as RequestInit).body)).toContain("code_verifier=verifier-1");
    expect(String((call[1] as RequestInit).body)).toContain("grant_type=authorization_code");
  });

  it("throws on a non-2xx token response", async () => {
    const bad = vi.fn(async () => ({ ok: false, status: 400 }) as unknown as Response) as unknown as typeof fetch;
    await expect(exchangeCode(config, "c", "v", { fetchImpl: bad })).rejects.toThrow();
  });
});

describe("verifyIdToken", () => {
  it("returns a profile for valid claims", () => {
    const profile = verifyIdToken(makeIdToken(validClaims()), config, "nonce-1");
    expect(profile).toEqual({
      sub: "google-sub-1",
      email: "ava@example.com",
      emailVerified: true,
      name: "Ava Patel",
      picture: "https://lh3.googleusercontent.com/a/ava.jpg",
    });
  });

  it("rejects wrong audience, wrong issuer, expiry, nonce mismatch, and unverified email", () => {
    expect(verifyIdToken(makeIdToken(validClaims({ aud: "other" })), config, "nonce-1")).toBeNull();
    expect(verifyIdToken(makeIdToken(validClaims({ iss: "evil" })), config, "nonce-1")).toBeNull();
    expect(verifyIdToken(makeIdToken(validClaims({ exp: Math.floor(Date.now() / 1000) - 10 })), config, "nonce-1")).toBeNull();
    expect(verifyIdToken(makeIdToken(validClaims()), config, "different-nonce")).toBeNull();
    expect(verifyIdToken(makeIdToken(validClaims({ email_verified: false })), config, "nonce-1")).toBeNull();
  });

  it("drops a non-https picture and tolerates a malformed token", () => {
    const p = verifyIdToken(makeIdToken(validClaims({ picture: "http://insecure/a.jpg" })), config, "nonce-1");
    expect(p?.picture).toBeNull();
    expect(verifyIdToken("not-a-jwt", config, "nonce-1")).toBeNull();
  });
});

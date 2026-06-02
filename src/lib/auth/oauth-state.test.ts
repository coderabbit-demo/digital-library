import { describe, expect, it } from "vitest";
import { decodeOAuthState, encodeOAuthState } from "./oauth-state";
import type { OAuthStart } from "./google";

const start: OAuthStart = { state: "st-1", codeVerifier: "ver-1", codeChallenge: "ch", nonce: "no-1" };
const SECRET = "test-secret";

describe("oauth-state (google-auth DL-80)", () => {
  it("round-trips the signed payload", () => {
    const cookie = encodeOAuthState(start, SECRET);
    expect(decodeOAuthState(cookie, SECRET)).toEqual({ state: "st-1", codeVerifier: "ver-1", nonce: "no-1" });
  });

  it("rejects a tampered payload or wrong secret", () => {
    const cookie = encodeOAuthState(start, SECRET);
    expect(decodeOAuthState(cookie, "other-secret")).toBeNull();
    const [data, mac] = cookie.split(".");
    const tampered = `${Buffer.from(JSON.stringify({ state: "evil", codeVerifier: "x", nonce: "y" })).toString("base64url")}.${mac}`;
    expect(decodeOAuthState(tampered, SECRET)).toBeNull();
    expect(data).toBeTruthy();
  });

  it("returns null for missing or malformed values", () => {
    expect(decodeOAuthState(undefined, SECRET)).toBeNull();
    expect(decodeOAuthState("no-dot", SECRET)).toBeNull();
    expect(decodeOAuthState("a.b", SECRET)).toBeNull();
  });
});

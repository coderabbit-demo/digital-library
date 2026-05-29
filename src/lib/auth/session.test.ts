import { describe, expect, it } from "vitest";
import { generateSessionToken, hashSessionToken } from "./session";

describe("session tokens (DL-19)", () => {
  it("generates distinct, high-entropy tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url
  });

  it("hashes tokens deterministically to a 64-char sha-256 hex digest", () => {
    const token = "example-token";
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never stores the raw token (hash differs from input)", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).not.toBe(token);
  });
});

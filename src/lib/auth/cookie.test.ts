import { describe, expect, it } from "vitest";
import { sessionCookieOptions } from "./cookie";

describe("session cookie options (DL-19)", () => {
  const expires = new Date("2026-06-05T00:00:00.000Z");

  it("is always HTTP-only, SameSite=Lax, and root-scoped", () => {
    const opts = sessionCookieOptions(expires, false);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
    expect(opts.expires).toBe(expires);
  });

  it("is Secure only in production", () => {
    expect(sessionCookieOptions(expires, true).secure).toBe(true);
    expect(sessionCookieOptions(expires, false).secure).toBe(false);
  });
});

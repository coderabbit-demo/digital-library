import { describe, expect, it } from "vitest";
import { poolMax, requireDatabaseUrl } from "./client";

describe("db client config (DL-15)", () => {
  it("requires DATABASE_URL and returns it when present", () => {
    expect(requireDatabaseUrl({ DATABASE_URL: "postgres://x" })).toBe("postgres://x");
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => requireDatabaseUrl({})).toThrow("DATABASE_URL");
  });

  it("uses a single connection on serverless and a pool locally", () => {
    expect(poolMax({ VERCEL: "1" })).toBe(1);
    expect(poolMax({})).toBe(10);
  });
});

import { describe, expect, it } from "vitest";
import { readServerEnv, REQUIRED_SERVER_ENV } from "./env";

describe("server env validation (DL-18)", () => {
  it("returns the typed config when all required vars are present", () => {
    const env = readServerEnv({ DATABASE_URL: "postgres://x", AUTH_SECRET: "s3cret" });
    expect(env).toEqual({ DATABASE_URL: "postgres://x", AUTH_SECRET: "s3cret" });
  });

  it("fails fast listing every missing variable", () => {
    expect(() => readServerEnv({})).toThrow(/DATABASE_URL, AUTH_SECRET/);
  });

  it("treats blank values as missing", () => {
    expect(() => readServerEnv({ DATABASE_URL: "  ", AUTH_SECRET: "s" })).toThrow("DATABASE_URL");
  });

  it("requires DATABASE_URL and AUTH_SECRET", () => {
    expect([...REQUIRED_SERVER_ENV]).toEqual(["DATABASE_URL", "AUTH_SECRET"]);
  });
});

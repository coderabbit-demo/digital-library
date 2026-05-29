import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing (DL-19)", () => {
  it("hashes to something other than the plaintext", async () => {
    const hash = await hashPassword("readmore");
    expect(hash).not.toBe("readmore");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verifies a correct password and rejects an incorrect one", async () => {
    const hash = await hashPassword("readmore");
    expect(await verifyPassword("readmore", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

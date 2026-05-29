import { describe, expect, it } from "vitest";
import { pickAvatarColor, validateLogin, validateRegistration } from "./service";

describe("auth input validation (DL-20)", () => {
  it("accepts and normalizes valid registration input", () => {
    expect(validateRegistration({ name: "  Ava  ", email: "Ava@Example.com", password: "pw" })).toEqual({
      name: "Ava",
      email: "ava@example.com",
      password: "pw",
    });
  });

  it("rejects registration with any empty field", () => {
    expect(validateRegistration({ name: "", email: "a@b.com", password: "pw" })).toBeNull();
    expect(validateRegistration({ name: "Ava", email: "  ", password: "pw" })).toBeNull();
    expect(validateRegistration({ name: "Ava", email: "a@b.com", password: "" })).toBeNull();
    expect(validateRegistration({})).toBeNull();
  });

  it("validates and normalizes login input", () => {
    expect(validateLogin({ email: "Ava@Example.com", password: "pw" })).toEqual({
      email: "ava@example.com",
      password: "pw",
    });
    expect(validateLogin({ email: "", password: "pw" })).toBeNull();
  });

  it("picks a stable avatar color from a seed", () => {
    const a = pickAvatarColor("ava@example.com");
    expect(a).toMatch(/^#[0-9a-f]{6}$/);
    expect(pickAvatarColor("ava@example.com")).toBe(a);
  });
});

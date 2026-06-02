/**
 * Integration tests (google-auth DL-80) for resolveGoogleUser against pglite:
 * create-on-first-use, returning-by-sub, link-by-verified-email (password still
 * works; avatar filled only when empty).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findEntry } from "@/db/queries";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import type { GoogleProfile } from "./google";
import { loginMember, registerMember, resolveGoogleUser } from "./service";

let db: Db;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createTestDb());
});
afterEach(async () => {
  await close();
});

const profile = (over: Partial<GoogleProfile> = {}): GoogleProfile => ({
  sub: "google-sub-1",
  email: "ava@example.com",
  emailVerified: true,
  name: "Ava Patel",
  picture: "https://lh3.googleusercontent.com/a/ava.jpg",
  ...over,
});

describe("resolveGoogleUser (google-auth DL-80)", () => {
  it("creates a member + google identity with the picture on first use", async () => {
    const user = await resolveGoogleUser(db, profile());
    expect(user.email).toBe("ava@example.com");
    expect(user.name).toBe("Ava Patel");
    expect(user.avatarUrl).toBe("https://lh3.googleusercontent.com/a/ava.jpg");
    expect(user.kind).toBe("member");
  });

  it("returns the same user on a later sign-in (matched by sub, no duplicate)", async () => {
    const first = await resolveGoogleUser(db, profile());
    const second = await resolveGoogleUser(db, profile({ name: "Ava P.", picture: "https://x/new.jpg" }));
    expect(second.id).toBe(first.id);
  });

  it("links to an existing password account by verified email; password still works", async () => {
    const reg = await registerMember(db, { name: "Ava", email: "ava@example.com", password: "readmore" });
    if (!reg.ok) throw new Error("registration failed");

    const linked = await resolveGoogleUser(db, profile());
    expect(linked.id).toBe(reg.user.id); // same account, not a duplicate
    expect(linked.avatarUrl).toBe("https://lh3.googleusercontent.com/a/ava.jpg"); // filled (was empty)

    // The original password credential remains usable.
    const byPassword = await loginMember(db, { email: "ava@example.com", password: "readmore" });
    expect(byPassword?.id).toBe(reg.user.id);
  });

  it("does not clobber an existing avatar when linking", async () => {
    const reg = await registerMember(db, { name: "Ava", email: "ava@example.com", password: "readmore" });
    if (!reg.ok) throw new Error("registration failed");
    // First Google sign-in creates the link + sets the avatar.
    await resolveGoogleUser(db, profile({ picture: "https://x/first.jpg" }));
    // A later sign-in must not overwrite the stored avatar.
    const again = await resolveGoogleUser(db, profile({ picture: "https://x/second.jpg" }));
    expect(again.avatarUrl).toBe("https://x/first.jpg");
  });

  it("creates an isolated user that has no library entries yet", async () => {
    const user = await resolveGoogleUser(db, profile());
    expect(await findEntry(db, user.id, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});

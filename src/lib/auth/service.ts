/**
 * Auth service (DL-19/DL-20): registration and login built on the password and
 * session primitives. Registration runs in a transaction (atomic user +
 * credential) and relies on the unique email constraint as a backstop.
 */
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { isUniqueViolation } from "@/db/errors";
import { findPasswordCredential, normalizeEmail } from "@/db/queries";
import { authIdentities, users } from "@/db/schema";
import { toUser } from "@/db/mappers";
import type { User } from "@/lib/types";
import { hashPassword, verifyPassword } from "./password";

const AVATAR_COLORS = ["#2f7d7e", "#8b4a62", "#7a6426", "#4f6f9f", "#6b7650"];
const DEFAULT_AVATAR_COLOR = "#2f7d7e";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}
export interface LoginInput {
  email: string;
  password: string;
}

/** Pure: trims, normalizes email, and rejects empty fields. */
export function validateRegistration(input: {
  name?: unknown;
  email?: unknown;
  password?: unknown;
}): RegisterInput | null {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!name || !email || !password) return null;
  return { name, email: normalizeEmail(email), password };
}

export function validateLogin(input: { email?: unknown; password?: unknown }): LoginInput | null {
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!email || !password) return null;
  return { email: normalizeEmail(email), password };
}

/** Deterministic avatar color so a user keeps the same tint across sessions. */
export function pickAvatarColor(seed: string): string {
  let sum = 0;
  for (const ch of seed) sum += ch.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length] ?? DEFAULT_AVATAR_COLOR;
}

export type RegisterResult = { ok: true; user: User } | { ok: false; error: "email_taken" };

export async function registerMember(db: Db, input: RegisterInput): Promise<RegisterResult> {
  // Normalize defensively so lookups (which lowercase) always match, regardless
  // of caller — not only when routed through validateRegistration.
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existing) return { ok: false as const, error: "email_taken" as const };

      const [row] = await tx
        .insert(users)
        .values({
          kind: "member",
          name: input.name,
          email,
          avatarColor: pickAvatarColor(email),
          bio: "",
        })
        .returning();
      if (!row) throw new Error("failed to create user");

      await tx
        .insert(authIdentities)
        .values({ userId: row.id, provider: "password", passwordHash });
      return { ok: true as const, user: toUser(row) };
    });
  } catch (error) {
    // A concurrent registration can pass the pre-check and lose the unique-email
    // race at insert; surface that as the same duplicate-email result, not a 500.
    if (isUniqueViolation(error)) return { ok: false, error: "email_taken" };
    throw error;
  }
}

/** Returns the user on valid credentials, else null (no enumeration). */
export async function loginMember(db: Db, input: LoginInput): Promise<User | null> {
  const credential = await findPasswordCredential(db, input.email);
  if (!credential) return null;
  const valid = await verifyPassword(input.password, credential.passwordHash);
  return valid ? credential.user : null;
}

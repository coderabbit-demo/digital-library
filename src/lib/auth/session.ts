/**
 * Server-validated, revocable sessions (DL-19).
 *
 * The browser holds an opaque random token in an HTTP-only cookie; only its
 * SHA-256 hash is stored in the database, so a leaked database row cannot be
 * replayed as a session. Sign-out deletes the row (true revocation).
 */
import { createHash, randomBytes } from "node:crypto";
import type { Db } from "@/db/client";
import {
  deleteSessionByTokenHash,
  findSessionByTokenHash,
  findUserById,
  insertSession,
} from "@/db/queries";
import type { User } from "@/lib/types";
import { SESSION_TTL_MS } from "./constants";

/** 256 bits of entropy, URL-safe. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Tokens are stored only as their SHA-256 hash. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  db: Db,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await insertSession(db, { userId, tokenHash: hashSessionToken(token), expiresAt });
  return { token, expiresAt };
}

/** Resolve a cookie token to its user, or null if absent/unknown/expired. */
export async function resolveSession(db: Db, token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const session = await findSessionByTokenHash(db, tokenHash);
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await deleteSessionByTokenHash(db, tokenHash);
    return null;
  }
  return findUserById(db, session.userId);
}

export async function revokeSession(db: Db, token: string | undefined): Promise<void> {
  if (!token) return;
  await deleteSessionByTokenHash(db, hashSessionToken(token));
}

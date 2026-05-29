/**
 * Server-side accessor for the authenticated user (DL-21). Data endpoints and
 * server components derive the acting user from the verified session ONLY —
 * never from request input — and enforce ownership against this id.
 */
import { getDb } from "@/db/client";
import type { User } from "@/lib/types";
import { readSessionCookie } from "./cookie";
import { resolveSession } from "./session";

export async function getSessionUser(): Promise<User | null> {
  const token = await readSessionCookie();
  return resolveSession(getDb(), token);
}

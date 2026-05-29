/**
 * Typed data-access layer (DL-15).
 *
 * All persistence goes through these helpers, which use the Drizzle query
 * builder (no string-concatenated SQL, Req 10.6) and return shared domain
 * types. Each function takes the Db explicitly so callers (auth in DL-19, API
 * in DL-22..DL-26) inject the lazily-created client and tests can supply their
 * own. Execution against a real database is covered by integration tests once
 * the Docker Postgres lands (DL-17).
 */
import { and, desc, eq } from "drizzle-orm";
import type {
  Activity,
  ActivityAction,
  LibraryEntry,
  LibraryStatus,
  MediaItem,
  MediaType,
  Preferences,
  User,
} from "@/lib/types";
import type { Db } from "./client";
import {
  toActivity,
  toFeedEntry,
  toLibraryEntry,
  toMediaItem,
  toPreferences,
  toUser,
} from "./mappers";
import {
  activities,
  authIdentities,
  libraryEntries,
  mediaItems,
  preferences,
  sessions,
  users,
  type NewUserRow,
} from "./schema";

const FEED_DEFAULT_LIMIT = 12;

/** Emails are stored and compared in lowercase so exact-match lookups stay consistent. */
export function normalizeEmail<T extends string | null | undefined>(email: T): T {
  return (typeof email === "string" ? email.toLowerCase() : email) as T;
}

/* ----------------------------- users & auth ----------------------------- */

export async function findUserById(db: Db, id: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ? toUser(row) : null;
}

export async function findUserByEmail(db: Db, email: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  return row ? toUser(row) : null;
}

export async function insertUser(db: Db, input: NewUserRow): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({ ...input, email: normalizeEmail(input.email) })
    .returning();
  if (!row) throw new Error("insertUser returned no row");
  return toUser(row);
}

export async function updateUserProfile(
  db: Db,
  userId: string,
  patch: { name: string; email: string | null; bio: string },
): Promise<User | null> {
  const [row] = await db
    .update(users)
    .set({ name: patch.name, email: normalizeEmail(patch.email), bio: patch.bio })
    .where(eq(users.id, userId))
    .returning();
  return row ? toUser(row) : null;
}

/** Look up a password login by email, returning the user and stored hash. */
export async function findPasswordCredential(
  db: Db,
  email: string,
): Promise<{ user: User; passwordHash: string } | null> {
  const [row] = await db
    .select({ user: users, passwordHash: authIdentities.passwordHash })
    .from(authIdentities)
    .innerJoin(users, eq(authIdentities.userId, users.id))
    .where(and(eq(users.email, normalizeEmail(email)), eq(authIdentities.provider, "password")))
    .limit(1);
  if (!row || row.passwordHash === null) return null;
  return { user: toUser(row.user), passwordHash: row.passwordHash };
}

export async function insertPasswordIdentity(
  db: Db,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db.insert(authIdentities).values({ userId, provider: "password", passwordHash });
}

/* -------------------------------- sessions ------------------------------- */

export async function insertSession(
  db: Db,
  input: { userId: string; tokenHash: string; expiresAt: Date },
): Promise<void> {
  await db.insert(sessions).values(input);
}

export async function findSessionByTokenHash(
  db: Db,
  tokenHash: string,
): Promise<{ userId: string; expiresAt: Date } | null> {
  const [row] = await db
    .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  return row ?? null;
}

export async function deleteSessionByTokenHash(db: Db, tokenHash: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

/* --------------------------------- media --------------------------------- */

export async function listMedia(db: Db, type?: MediaType): Promise<MediaItem[]> {
  const rows = await db
    .select()
    .from(mediaItems)
    .where(type ? eq(mediaItems.type, type) : undefined);
  return rows.map(toMediaItem);
}

export async function findMediaById(db: Db, id: string): Promise<MediaItem | null> {
  const [row] = await db.select().from(mediaItems).where(eq(mediaItems.id, id)).limit(1);
  return row ? toMediaItem(row) : null;
}

export async function findMediaByTitleCreator(
  db: Db,
  title: string,
  creator: string,
): Promise<MediaItem | null> {
  const [row] = await db
    .select()
    .from(mediaItems)
    .where(and(eq(mediaItems.title, title), eq(mediaItems.creator, creator)))
    .limit(1);
  return row ? toMediaItem(row) : null;
}

export async function insertMediaItem(
  db: Db,
  input: Omit<MediaItem, "id">,
): Promise<MediaItem> {
  const [row] = await db.insert(mediaItems).values(input).returning();
  if (!row) throw new Error("insertMediaItem returned no row");
  return toMediaItem(row);
}

/* ----------------------------- library entries --------------------------- */

export async function listEntriesForUser(db: Db, userId: string): Promise<LibraryEntry[]> {
  const rows = await db.select().from(libraryEntries).where(eq(libraryEntries.userId, userId));
  return rows.map(toLibraryEntry);
}

export async function findEntry(
  db: Db,
  userId: string,
  mediaItemId: string,
): Promise<LibraryEntry | null> {
  const [row] = await db
    .select()
    .from(libraryEntries)
    .where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.mediaItemId, mediaItemId)))
    .limit(1);
  return row ? toLibraryEntry(row) : null;
}

/** Create or move a library entry's shelf for a user (one entry per user+media). */
export async function upsertEntryStatus(
  db: Db,
  input: { userId: string; mediaItemId: string; status: LibraryStatus; updatedAt: Date },
): Promise<LibraryEntry> {
  const [row] = await db
    .insert(libraryEntries)
    .values(input)
    .onConflictDoUpdate({
      target: [libraryEntries.userId, libraryEntries.mediaItemId],
      set: { status: input.status, updatedAt: input.updatedAt },
    })
    .returning();
  if (!row) throw new Error("upsertEntryStatus returned no row");
  return toLibraryEntry(row);
}

export async function saveReview(
  db: Db,
  input: { entryId: string; userId: string; rating: number; review: string; updatedAt: Date },
): Promise<LibraryEntry | null> {
  const [row] = await db
    .update(libraryEntries)
    .set({
      status: "finished",
      rating: input.rating,
      review: input.review,
      updatedAt: input.updatedAt,
    })
    .where(and(eq(libraryEntries.id, input.entryId), eq(libraryEntries.userId, input.userId)))
    .returning();
  return row ? toLibraryEntry(row) : null;
}

/* -------------------------------- activities ----------------------------- */

export async function insertActivity(
  db: Db,
  input: { userId: string; mediaItemId: string; action: ActivityAction; detail: string; createdAt: Date },
): Promise<Activity> {
  const [row] = await db.insert(activities).values(input).returning();
  if (!row) throw new Error("insertActivity returned no row");
  return toActivity(row);
}

/** Community feed: activities joined to actor + media, newest first. The inner
 *  joins drop any activity whose user or media item cannot be resolved (Req 4.6). */
export async function listFeed(
  db: Db,
  opts: { type?: MediaType; limit?: number } = {},
): Promise<ReturnType<typeof toFeedEntry>[]> {
  const rows = await db
    .select({ activity: activities, actor: users, media: mediaItems })
    .from(activities)
    .innerJoin(users, eq(activities.userId, users.id))
    .innerJoin(mediaItems, eq(activities.mediaItemId, mediaItems.id))
    .where(opts.type ? eq(mediaItems.type, opts.type) : undefined)
    .orderBy(desc(activities.createdAt))
    .limit(opts.limit ?? FEED_DEFAULT_LIMIT);
  return rows.map((r) => toFeedEntry(r.activity, r.actor, r.media));
}

/* ------------------------------- preferences ----------------------------- */

export async function findPreferences(db: Db, userId: string): Promise<Preferences | null> {
  const [row] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, userId))
    .limit(1);
  return row ? toPreferences(row) : null;
}

export async function upsertPreferences(
  db: Db,
  userId: string,
  prefs: Preferences,
): Promise<Preferences> {
  const [row] = await db
    .insert(preferences)
    .values({ userId, ...prefs })
    .onConflictDoUpdate({ target: preferences.userId, set: prefs })
    .returning();
  if (!row) throw new Error("upsertPreferences returned no row");
  return toPreferences(row);
}

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
import { and, count, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import type {
  Activity,
  ActivityAction,
  Goal,
  LibraryEntry,
  LibraryStatus,
  MediaEnrichment,
  MediaItem,
  MediaType,
  Preferences,
  User,
  UserAchievement,
} from "@/lib/types";
import type { DbExecutor } from "./client";
import {
  toActivity,
  toFeedEntry,
  toGoal,
  toLibraryEntry,
  toMediaItem,
  toPreferences,
  toUser,
  toUserAchievement,
} from "./mappers";
import {
  activities,
  authIdentities,
  goals,
  libraryEntries,
  libraryEntryTags,
  mediaItems,
  preferences,
  sessions,
  userAchievements,
  users,
  type NewUserRow,
} from "./schema";

const FEED_DEFAULT_LIMIT = 12;

/** Emails are stored and compared in lowercase so exact-match lookups stay consistent. */
export function normalizeEmail<T extends string | null | undefined>(email: T): T {
  return (typeof email === "string" ? email.toLowerCase() : email) as T;
}

/* ----------------------------- users & auth ----------------------------- */

export async function findUserById(db: DbExecutor, id: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ? toUser(row) : null;
}

export async function findUserByEmail(db: DbExecutor, email: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  return row ? toUser(row) : null;
}

export async function insertUser(db: DbExecutor, input: NewUserRow): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({ ...input, email: normalizeEmail(input.email) })
    .returning();
  if (!row) throw new Error("insertUser returned no row");
  return toUser(row);
}

export async function updateUserProfile(db: DbExecutor,
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
export async function findPasswordCredential(db: DbExecutor,
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

export async function insertPasswordIdentity(db: DbExecutor,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db.insert(authIdentities).values({ userId, provider: "password", passwordHash });
}

/* -------------------------------- sessions ------------------------------- */

export async function insertSession(db: DbExecutor,
  input: { userId: string; tokenHash: string; expiresAt: Date },
): Promise<void> {
  await db.insert(sessions).values(input);
}

export async function findSessionByTokenHash(db: DbExecutor,
  tokenHash: string,
): Promise<{ userId: string; expiresAt: Date } | null> {
  const [row] = await db
    .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  return row ?? null;
}

export async function deleteSessionByTokenHash(db: DbExecutor, tokenHash: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

/* --------------------------------- media --------------------------------- */

export async function listMedia(db: DbExecutor, type?: MediaType): Promise<MediaItem[]> {
  const rows = await db
    .select()
    .from(mediaItems)
    .where(type ? eq(mediaItems.type, type) : undefined);
  return rows.map(toMediaItem);
}

export async function findMediaById(db: DbExecutor, id: string): Promise<MediaItem | null> {
  const [row] = await db.select().from(mediaItems).where(eq(mediaItems.id, id)).limit(1);
  return row ? toMediaItem(row) : null;
}

export async function findMediaByTitleCreator(db: DbExecutor,
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

/** Type-scoped, case-insensitive match for de-duping trending adds (Req 7.5). */
export async function findMediaByTypeTitleCreator(
  db: DbExecutor,
  type: string,
  title: string,
  creator: string,
): Promise<MediaItem | null> {
  const [row] = await db
    .select()
    .from(mediaItems)
    .where(
      and(
        eq(mediaItems.type, type),
        sql`lower(${mediaItems.title}) = lower(${title})`,
        sql`lower(${mediaItems.creator}) = lower(${creator})`,
      ),
    )
    .limit(1);
  return row ? toMediaItem(row) : null;
}

/**
 * Fields accepted when creating a media row. Resolver-managed fields are
 * excluded: `artworkCheckedAt` (set via updateMediaArtwork) and the enrichment
 * pair (set via updateMediaEnrichment). `artworkUrl` may be supplied (e.g.
 * provider art on a trending add).
 */
export type MediaCreateInput = Omit<
  MediaItem,
  "id" | "artworkCheckedAt" | "enrichment" | "enrichmentCheckedAt"
>;

export async function insertMediaItem(db: DbExecutor,
  input: MediaCreateInput,
): Promise<MediaItem> {
  const [row] = await db.insert(mediaItems).values(input).returning();
  if (!row) throw new Error("insertMediaItem returned no row");
  return toMediaItem(row);
}

/** Set (or clear) a media item's resolved cover and stamp the resolution
 *  attempt, so the lookup is not repeated once an outcome is known (cover-art
 *  Req 4.2, 4.5). */
export async function updateMediaArtwork(
  db: DbExecutor,
  id: string,
  artworkUrl: string | null,
  checkedAt: Date,
): Promise<void> {
  await db
    .update(mediaItems)
    .set({ artworkUrl, artworkCheckedAt: checkedAt })
    .where(eq(mediaItems.id, id));
}

/** Set a media item's resolved enrichment and stamp the resolution attempt, so
 *  the external lookup is not repeated once an outcome is known — including a
 *  definitive "no data" (null) result (media-detail-enrichment Req 2.2, 2.3). */
export async function updateMediaEnrichment(
  db: DbExecutor,
  id: string,
  enrichment: MediaEnrichment | null,
  checkedAt: Date,
): Promise<void> {
  await db
    .update(mediaItems)
    .set({ enrichment, enrichmentCheckedAt: checkedAt })
    .where(eq(mediaItems.id, id));
}

/** Media rows that still need a cover: never attempted and without artwork
 *  (cover-art Req 4.1). Ordered by id for deterministic batch backfill. */
export async function findMediaNeedingCover(db: DbExecutor, limit: number): Promise<MediaItem[]> {
  const rows = await db
    .select()
    .from(mediaItems)
    .where(and(isNull(mediaItems.artworkUrl), isNull(mediaItems.artworkCheckedAt)))
    .orderBy(mediaItems.id)
    .limit(limit);
  return rows.map(toMediaItem);
}

/**
 * Atomically find-or-create a media row by its natural key (DL-64). Relies on
 * the unique index on (type, lower(title), lower(creator)): insert-on-conflict
 * either creates the row or no-ops, and the re-select returns the existing one —
 * so concurrent callers can never create duplicates.
 */
export async function findOrCreateMedia(
  db: DbExecutor,
  input: MediaCreateInput,
): Promise<{ media: MediaItem; created: boolean }> {
  const [inserted] = await db.insert(mediaItems).values(input).onConflictDoNothing().returning();
  if (inserted) return { media: toMediaItem(inserted), created: true };
  const existing = await findMediaByTypeTitleCreator(db, input.type, input.title, input.creator);
  if (!existing) throw new Error("findOrCreateMedia: conflict but no existing row found");
  return { media: existing, created: false };
}

/* ----------------------------- library entries --------------------------- */

export async function listEntriesForUser(db: DbExecutor, userId: string): Promise<LibraryEntry[]> {
  const rows = await db.select().from(libraryEntries).where(eq(libraryEntries.userId, userId));
  return rows.map(toLibraryEntry);
}

export async function findEntry(db: DbExecutor,
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
export async function upsertEntryStatus(db: DbExecutor,
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

export async function saveReview(db: DbExecutor,
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

export async function insertActivity(db: DbExecutor,
  input: { userId: string; mediaItemId: string; action: ActivityAction; detail: string; createdAt: Date },
): Promise<Activity> {
  const [row] = await db.insert(activities).values(input).returning();
  if (!row) throw new Error("insertActivity returned no row");
  return toActivity(row);
}

/** Community feed: activities joined to actor + media, newest first. The inner
 *  joins drop any activity whose user or media item cannot be resolved (Req 4.6). */
export async function listFeed(db: DbExecutor,
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

/** A user's own activity timestamps (ISO), for streak computation (Req 5.3). */
export async function listActivityDatesForUser(db: DbExecutor, userId: string): Promise<string[]> {
  const rows = await db
    .select({ createdAt: activities.createdAt })
    .from(activities)
    .where(eq(activities.userId, userId));
  return rows.map((r) => r.createdAt.toISOString());
}

/* ----------------------------- entry tags (Req 2) ------------------------ */

/** Tags for a set of entries, aggregated per entry id and sorted for stable display. */
export async function listTagsByEntryIds(
  db: DbExecutor,
  entryIds: readonly string[],
): Promise<Map<string, string[]>> {
  const byEntry = new Map<string, string[]>();
  if (entryIds.length === 0) return byEntry;
  const rows = await db
    .select()
    .from(libraryEntryTags)
    .where(inArray(libraryEntryTags.entryId, [...entryIds]));
  for (const row of rows) {
    const list = byEntry.get(row.entryId) ?? [];
    list.push(row.tag);
    byEntry.set(row.entryId, list);
  }
  for (const [key, list] of byEntry) byEntry.set(key, list.sort());
  return byEntry;
}

/**
 * Replace an entry's tag set. Returns null if the entry is not owned by the
 * user (so the handler can answer 404); otherwise returns the new tags. Run
 * inside a transaction so the delete+insert is atomic.
 */
export async function setEntryTags(
  db: DbExecutor,
  input: { entryId: string; userId: string; tags: string[] },
): Promise<string[] | null> {
  const [owned] = await db
    .select({ id: libraryEntries.id })
    .from(libraryEntries)
    .where(and(eq(libraryEntries.id, input.entryId), eq(libraryEntries.userId, input.userId)))
    .limit(1);
  if (!owned) return null;

  await db.delete(libraryEntryTags).where(eq(libraryEntryTags.entryId, input.entryId));
  // Defensively de-duplicate so a caller passing repeats can't violate the
  // (entry_id, tag) unique constraint after the delete has already run.
  const tags = [...new Set(input.tags)];
  if (tags.length > 0) {
    await db
      .insert(libraryEntryTags)
      .values(tags.map((tag) => ({ entryId: input.entryId, tag })));
  }
  return tags;
}

/* --------------------------- progress (Req 3) ---------------------------- */

/** Record consumption progress on the user's own entry; null if not owned. */
export async function updateEntryProgress(
  db: DbExecutor,
  input: { entryId: string; userId: string; progress: number; updatedAt: Date },
): Promise<LibraryEntry | null> {
  const [row] = await db
    .update(libraryEntries)
    .set({ progress: input.progress, updatedAt: input.updatedAt })
    .where(and(eq(libraryEntries.id, input.entryId), eq(libraryEntries.userId, input.userId)))
    .returning();
  return row ? toLibraryEntry(row) : null;
}

/* ----------------------------- goals (Req 4) ----------------------------- */

export async function getActiveGoal(
  db: DbExecutor,
  userId: string,
  period: string,
  periodKey: string,
): Promise<Goal | null> {
  const [row] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.period, period), eq(goals.periodKey, periodKey)))
    .limit(1);
  return row ? toGoal(row) : null;
}

/** Create or update the goal for a user/period/period-key (idempotent). */
export async function upsertGoal(
  db: DbExecutor,
  input: { userId: string; period: string; periodKey: string; targetCount: number },
): Promise<Goal> {
  const [row] = await db
    .insert(goals)
    .values(input)
    .onConflictDoUpdate({
      target: [goals.userId, goals.period, goals.periodKey],
      set: { targetCount: input.targetCount },
    })
    .returning();
  if (!row) throw new Error("upsertGoal returned no row");
  return toGoal(row);
}

/** Count the user's finished entries updated within [from, to) — goal progress. */
export async function countFinishedBetween(
  db: DbExecutor,
  userId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(libraryEntries)
    .where(
      and(
        eq(libraryEntries.userId, userId),
        eq(libraryEntries.status, "finished"),
        gte(libraryEntries.updatedAt, from),
        lt(libraryEntries.updatedAt, to),
      ),
    );
  return row?.value ?? 0;
}

/* ------------------------- achievements (Req 6) -------------------------- */

export async function listUserAchievements(
  db: DbExecutor,
  userId: string,
): Promise<UserAchievement[]> {
  const rows = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
  return rows.map(toUserAchievement);
}

/** Record first unlocks idempotently; existing rows are left untouched. */
export async function insertAchievementUnlocks(
  db: DbExecutor,
  userId: string,
  keys: readonly string[],
): Promise<void> {
  if (keys.length === 0) return;
  await db
    .insert(userAchievements)
    .values(keys.map((achievementKey) => ({ userId, achievementKey })))
    .onConflictDoNothing({
      target: [userAchievements.userId, userAchievements.achievementKey],
    });
}

/* ------------------------------- preferences ----------------------------- */

export async function findPreferences(db: DbExecutor, userId: string): Promise<Preferences | null> {
  const [row] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, userId))
    .limit(1);
  return row ? toPreferences(row) : null;
}

export async function upsertPreferences(db: DbExecutor,
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

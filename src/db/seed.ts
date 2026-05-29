/**
 * Database seed routine (DL-16).
 *
 * Populates the prototype's starter catalog (as `ebook` media), the feed-only
 * community users (no credentials), and a demo member with a bcrypt-hashed
 * password identity, so the app is demonstrable immediately after setup. Run
 * with `npm run db:seed` once a database is available (Docker Postgres, DL-17).
 *
 * Idempotent: clears the seeded tables first so re-running yields a clean state.
 */
import bcrypt from "bcryptjs";
import { getDb, type Db } from "./client";
import {
  activities,
  authIdentities,
  libraryEntries,
  mediaItems,
  preferences,
  sessions,
  users,
} from "./schema";
import {
  seedActivities,
  seedCommunityUsers,
  seedDemoMember,
  seedLibraryEntries,
  seedMediaItems,
} from "./seed-data";

const BCRYPT_COST = 12;

export async function seed(db: Db): Promise<void> {
  // Clear in FK-safe order so re-seeding is deterministic.
  await db.delete(activities);
  await db.delete(libraryEntries);
  await db.delete(preferences);
  await db.delete(sessions);
  await db.delete(authIdentities);
  await db.delete(mediaItems);
  await db.delete(users);

  // Media catalog.
  const mediaIdByKey = new Map<string, string>();
  for (const m of seedMediaItems) {
    const [row] = await db
      .insert(mediaItems)
      .values({
        type: m.type,
        title: m.title,
        creator: m.creator,
        genre: m.genre,
        language: m.language,
        description: m.description,
        coverTheme: m.coverTheme,
      })
      .returning({ id: mediaItems.id });
    if (row) mediaIdByKey.set(m.key, row.id);
  }

  // Users: community actors + the demo member.
  const userIdByKey = new Map<string, string>();
  for (const c of seedCommunityUsers) {
    const [row] = await db
      .insert(users)
      .values({ kind: "community", name: c.name, avatarColor: c.avatarColor })
      .returning({ id: users.id });
    if (row) userIdByKey.set(c.key, row.id);
  }
  const [member] = await db
    .insert(users)
    .values({
      kind: "member",
      name: seedDemoMember.name,
      email: seedDemoMember.email,
      avatarColor: seedDemoMember.avatarColor,
      bio: seedDemoMember.bio,
    })
    .returning({ id: users.id });
  if (!member) throw new Error("failed to insert demo member");
  userIdByKey.set(seedDemoMember.key, member.id);

  // Demo member credentials + preferences.
  await db.insert(authIdentities).values({
    userId: member.id,
    provider: "password",
    passwordHash: await bcrypt.hash(seedDemoMember.password, BCRYPT_COST),
  });
  await db.insert(preferences).values({ userId: member.id, ...seedDemoMember.preferences });

  // Demo member's shelves.
  for (const e of seedLibraryEntries) {
    const userId = userIdByKey.get(e.userKey);
    const mediaItemId = mediaIdByKey.get(e.mediaKey);
    if (!userId || !mediaItemId) continue;
    await db.insert(libraryEntries).values({
      userId,
      mediaItemId,
      status: e.status,
      rating: e.rating,
      review: e.review,
      updatedAt: new Date(e.updatedAt),
    });
  }

  // Community + member activity for the feed.
  for (const a of seedActivities) {
    const userId = userIdByKey.get(a.userKey);
    const mediaItemId = mediaIdByKey.get(a.mediaKey);
    if (!userId || !mediaItemId) continue;
    await db.insert(activities).values({
      userId,
      mediaItemId,
      action: a.action,
      detail: a.detail,
      createdAt: new Date(a.createdAt),
    });
  }
}

// Entry point for `npm run db:seed`.
const isDirectRun = process.argv[1]?.endsWith("seed.ts") ?? false;
if (isDirectRun) {
  seed(getDb())
    .then(() => {
      console.log("Seed complete.");
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}

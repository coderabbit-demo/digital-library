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
  // Run the whole reset+repopulate atomically: any failure (including an
  // unresolved reference below) rolls back, so the database is never left in a
  // partially wiped or partially populated state.
  await db.transaction(async (tx) => {
    // Clear in FK-safe order so re-seeding is deterministic.
    await tx.delete(activities);
    await tx.delete(libraryEntries);
    await tx.delete(preferences);
    await tx.delete(sessions);
    await tx.delete(authIdentities);
    await tx.delete(mediaItems);
    await tx.delete(users);

    // Media catalog.
    const mediaIdByKey = new Map<string, string>();
    for (const m of seedMediaItems) {
      const [row] = await tx
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
      if (!row) throw new Error(`failed to insert media item: ${m.key}`);
      mediaIdByKey.set(m.key, row.id);
    }

    // Users: community actors + the demo member.
    const userIdByKey = new Map<string, string>();
    for (const c of seedCommunityUsers) {
      const [row] = await tx
        .insert(users)
        .values({ kind: "community", name: c.name, avatarColor: c.avatarColor })
        .returning({ id: users.id });
      if (!row) throw new Error(`failed to insert community user: ${c.key}`);
      userIdByKey.set(c.key, row.id);
    }
    const [member] = await tx
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
    await tx.insert(authIdentities).values({
      userId: member.id,
      provider: "password",
      passwordHash: await bcrypt.hash(seedDemoMember.password, BCRYPT_COST),
    });
    await tx.insert(preferences).values({ userId: member.id, ...seedDemoMember.preferences });

    // Resolve a seed key to its generated id, failing the transaction if missing.
    const resolve = (map: Map<string, string>, key: string, kind: string): string => {
      const id = map.get(key);
      if (!id) throw new Error(`unresolved ${kind} reference in seed data: ${key}`);
      return id;
    };

    // Demo member's shelves.
    for (const e of seedLibraryEntries) {
      await tx.insert(libraryEntries).values({
        userId: resolve(userIdByKey, e.userKey, "user"),
        mediaItemId: resolve(mediaIdByKey, e.mediaKey, "media"),
        status: e.status,
        rating: e.rating,
        review: e.review,
        updatedAt: new Date(e.updatedAt),
      });
    }

    // Community + member activity for the feed.
    for (const a of seedActivities) {
      await tx.insert(activities).values({
        userId: resolve(userIdByKey, a.userKey, "user"),
        mediaItemId: resolve(mediaIdByKey, a.mediaKey, "media"),
        action: a.action,
        detail: a.detail,
        createdAt: new Date(a.createdAt),
      });
    }
  });
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

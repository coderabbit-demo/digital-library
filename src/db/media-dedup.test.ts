/**
 * Integration tests (DL-64) for the atomic media de-dup, against pglite with the
 * unique index migration applied. find-or-create converges duplicates (incl.
 * case-insensitive and concurrent) onto a single catalog row.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findOrCreateMedia, listMedia } from "@/db/queries";
import type { Db } from "./client";
import type { MediaItem } from "@/lib/types";
import { createTestDb } from "./test-db";

let db: Db;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createTestDb());
});
afterEach(async () => {
  await close();
});

function media(over: Partial<Omit<MediaItem, "id">> = {}): Omit<MediaItem, "id"> {
  return {
    type: "ebook",
    title: "Circe",
    creator: "Madeline Miller",
    genre: "Fiction",
    language: "English",
    description: "",
    coverTheme: "gold",
    metadata: null,
    totalUnits: null,
    ...over,
  };
}

describe("findOrCreateMedia (DL-64)", () => {
  it("creates once, then reuses on a case-insensitive duplicate key", async () => {
    const first = await findOrCreateMedia(db, media());
    expect(first.created).toBe(true);

    const second = await findOrCreateMedia(db, media({ title: "circe", creator: "MADELINE MILLER" }));
    expect(second.created).toBe(false);
    expect(second.media.id).toBe(first.media.id);
    expect((await listMedia(db)).filter((m) => m.title === "Circe")).toHaveLength(1);
  });

  it("keeps distinct keys separate (type and creator matter)", async () => {
    await findOrCreateMedia(db, media({ title: "Dune", creator: "Frank Herbert" }));
    const other = await findOrCreateMedia(db, media({ title: "Dune", creator: "Denis Villeneuve", type: "tv_movie" }));
    expect(other.created).toBe(true);
    expect((await listMedia(db)).filter((m) => m.title === "Dune")).toHaveLength(2);
  });

  it("converges concurrent find-or-creates onto a single row", async () => {
    const input = media({ title: "Babel", creator: "R. F. Kuang" });
    const results = await Promise.all([
      findOrCreateMedia(db, input),
      findOrCreateMedia(db, input),
      findOrCreateMedia(db, input),
    ]);
    expect(new Set(results.map((r) => r.media.id)).size).toBe(1);
    expect((await listMedia(db)).filter((m) => m.title === "Babel")).toHaveLength(1);
  });
});

const MIGRATIONS_DIR = join(process.cwd(), "src/db/migrations");

/** SQL of every migration before 0002 (the schema without the unique index). */
function preDedupSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && f < "0002")
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n")
    .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/g, "");
}

function dedupMigrationSql(): string {
  return readFileSync(join(MIGRATIONS_DIR, "0002_melted_ego.sql"), "utf8");
}

const K = "00000000-0000-4000-8000-000000000001";
const D1 = "00000000-0000-4000-8000-000000000002";
const D2 = "00000000-0000-4000-8000-000000000003";
const U = "00000000-0000-4000-8000-0000000000aa";

/**
 * Regression (DL-64): the migration must reconcile a user who owns library
 * entries on two non-keeper duplicates and none on the keeper. Without
 * collapsing entries per (user, group) first, both would repoint to the keeper
 * and violate library_entries_user_media_unique, aborting the migration.
 */
describe("0002 dedup migration on pre-existing duplicates", () => {
  it("collapses multi-duplicate ownership without violating the unique key", async () => {
    const client = new PGlite();
    try {
      await client.exec(preDedupSql());
      // Three media rows in one natural-key group (case-variant), keeper = K (smallest id).
      await client.exec(`
        INSERT INTO "media_items" ("id","type","title","creator","genre") VALUES
          ('${K}','ebook','Circe','Madeline Miller','Fiction'),
          ('${D1}','ebook','circe','madeline miller','Fiction'),
          ('${D2}','ebook','CIRCE','MADELINE MILLER','Fiction');
        INSERT INTO "users" ("id","kind","name","avatar_color") VALUES
          ('${U}','member','Reader','teal');
        -- User owns entries on D1 (wishlist) and D2 (finished), NONE on keeper K.
        INSERT INTO "library_entries" ("id","user_id","media_item_id","status","rating","review") VALUES
          ('00000000-0000-4000-8000-0000000000b1','${U}','${D1}','wishlist',NULL,''),
          ('00000000-0000-4000-8000-0000000000b2','${U}','${D2}','finished',5,'loved it');
        -- Tags split across both duplicate entries; 'myth' overlaps to exercise ON CONFLICT.
        INSERT INTO "library_entry_tags" ("entry_id","tag") VALUES
          ('00000000-0000-4000-8000-0000000000b1','tbr'),
          ('00000000-0000-4000-8000-0000000000b1','myth'),
          ('00000000-0000-4000-8000-0000000000b2','myth'),
          ('00000000-0000-4000-8000-0000000000b2','favorite');
        INSERT INTO "activities" ("user_id","media_item_id","action","detail") VALUES
          ('${U}','${D1}','added','D1'),
          ('${U}','${D2}','finished','D2');
      `);

      // Must not throw (previously aborted on the unique-constraint violation).
      await client.exec(dedupMigrationSql());

      const media = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM "media_items" WHERE lower("title")='circe'`,
      );
      expect(media.rows[0]?.count).toBe("1");

      const entries = await client.query<{ media_item_id: string; status: string }>(
        `SELECT "media_item_id", "status" FROM "library_entries" WHERE "user_id"='${U}'`,
      );
      expect(entries.rows).toHaveLength(1);
      expect(entries.rows[0]?.media_item_id).toBe(K);
      // Best status survives the collapse (finished > wishlist).
      expect(entries.rows[0]?.status).toBe("finished");

      const orphanActivities = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM "activities" WHERE "media_item_id" <> '${K}'`,
      );
      expect(orphanActivities.rows[0]?.count).toBe("0");

      // Tags from both collapsed entries are preserved on the survivor, deduped.
      const tags = await client.query<{ tag: string }>(
        `SELECT "tag" FROM "library_entry_tags" AS t
         JOIN "library_entries" AS e ON e."id" = t."entry_id"
         WHERE e."user_id" = '${U}' ORDER BY "tag"`,
      );
      expect(tags.rows.map((r) => r.tag)).toEqual(["favorite", "myth", "tbr"]);
    } finally {
      await client.close();
    }
  });
});

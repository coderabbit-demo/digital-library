/**
 * In-process Postgres for integration tests (DL-36) via pglite — no Docker
 * needed in CI. Applies the committed initial migration so tests run against
 * the real schema/constraints.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Db } from "./client";
import * as schema from "./schema";

const MIGRATIONS_DIR = join(process.cwd(), "src/db/migrations");

function migrationsSql(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) throw new Error("no migration files found");
  // Apply every migration in order so tests match the deployed schema.
  // pglite (PG15) provides gen_random_uuid() in core; the pgcrypto extension is
  // not bundled, so drop that statement for the in-process test database.
  return files
    .map((file) => readFileSync(join(MIGRATIONS_DIR, file), "utf8"))
    .join("\n")
    .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/g, "");
}

export interface TestDb {
  db: Db;
  close: () => Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  await client.exec(migrationsSql());
  // pglite's drizzle instance is structurally compatible with our query layer.
  const db = drizzle(client, { schema }) as unknown as Db;
  return { db, close: () => client.close() };
}

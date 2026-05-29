/**
 * Drizzle database client (DL-15).
 *
 * Uses postgres.js, configured per environment: serverless runtimes (e.g.
 * Vercel) reuse a single connection per instance to avoid exhausting Postgres
 * connections, while local/long-lived processes use a small pool. The client
 * is created lazily so importing the data-access layer never requires a live
 * database (full env validation arrives in DL-18).
 */
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

/** Throws if the connection string is absent (mini fail-fast; see DL-18). */
export function requireDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

/** Serverless instances keep a single connection; local dev uses a small pool. */
export function poolMax(env: Record<string, string | undefined> = process.env): number {
  return env.VERCEL ? 1 : 10;
}

let cached: Db | undefined;

function createDb(): Db {
  const client = postgres(requireDatabaseUrl(), { max: poolMax(), prepare: false });
  return drizzle(client, { schema });
}

/** Lazily-initialized shared client for the running app. */
export function getDb(): Db {
  cached ??= createDb();
  return cached;
}

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  activities,
  authIdentities,
  libraryEntries,
  mediaItems,
  preferences,
  sessions,
  users,
} from "./schema";

const columnNames = (table: Parameters<typeof getTableConfig>[0]): string[] =>
  getTableConfig(table).columns.map((c) => c.name);

describe("postgres schema (DL-14)", () => {
  it("models users, identities, sessions, media, entries, activities, preferences", () => {
    expect(getTableConfig(users).name).toBe("users");
    expect(getTableConfig(authIdentities).name).toBe("auth_identities");
    expect(getTableConfig(sessions).name).toBe("sessions");
    expect(getTableConfig(mediaItems).name).toBe("media_items");
    expect(getTableConfig(libraryEntries).name).toBe("library_entries");
    expect(getTableConfig(activities).name).toBe("activities");
    expect(getTableConfig(preferences).name).toBe("preferences");
  });

  it("makes email nullable but unique on the single users table", () => {
    const { columns, uniqueConstraints } = getTableConfig(users);
    const email = columns.find((c) => c.name === "email");
    expect(email?.notNull).toBe(false);
    expect(uniqueConstraints.some((u) => u.columns.some((c) => c.name === "email"))).toBe(true);
  });

  it("links library entries and activities to users and media via real FKs", () => {
    for (const table of [libraryEntries, activities]) {
      const refs = getTableConfig(table).foreignKeys.map((fk) =>
        getTableName(fk.reference().foreignTable),
      );
      expect(refs).toContain("users");
      expect(refs).toContain("media_items");
    }
  });

  it("constrains status, rating, kind, provider, and action via check constraints", () => {
    const checks = (table: Parameters<typeof getTableConfig>[0]): string[] =>
      getTableConfig(table).checks.map((c) => c.name);
    expect(checks(users)).toContain("users_kind_check");
    expect(checks(libraryEntries)).toEqual(
      expect.arrayContaining(["library_entries_status_check", "library_entries_rating_check"]),
    );
    expect(checks(authIdentities)).toEqual(
      expect.arrayContaining(["auth_identities_provider_check", "auth_identities_shape_check"]),
    );
    expect(checks(activities)).toContain("activities_action_check");
  });

  it("enforces one identity per provider per user", () => {
    const uniques = getTableConfig(authIdentities).uniqueConstraints.map((u) => u.name);
    expect(uniques).toContain("auth_identities_user_provider_unique");
  });

  it("keys preferences one-to-one via a primary-key on user_id", () => {
    const { columns, foreignKeys } = getTableConfig(preferences);
    const userId = columns.find((c) => c.name === "user_id");
    expect(userId?.primary).toBe(true); // PK => unique => true 1:1, not just an FK
    expect(foreignKeys).toHaveLength(1);
  });

  it("commits a versioned initial migration with the expected DDL (Req 10.2)", () => {
    const dir = join(process.cwd(), "src/db/migrations");
    const initial = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()[0];
    expect(initial).toMatch(/^0000_/);
    const sql = readFileSync(join(dir, initial as string), "utf8");
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    expect(sql).toContain('CREATE TABLE "users"');
    expect(sql).toContain("library_entries_rating_check");
    expect(sql).toContain('REFERENCES "public"."users"("id")');
  });
});

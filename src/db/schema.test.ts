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
    expect(checks(authIdentities)).toContain("auth_identities_provider_check");
    expect(checks(activities)).toContain("activities_action_check");
  });

  it("keys preferences one-to-one on user_id", () => {
    expect(columnNames(preferences)).toContain("user_id");
    expect(getTableConfig(preferences).foreignKeys).toHaveLength(1);
  });

  it("commits a versioned initial migration with the expected DDL (Req 10.2)", () => {
    const dir = join(process.cwd(), "src/db/migrations");
    const sqlFiles = readdirSync(dir).filter((f) => f.endsWith(".sql"));
    expect(sqlFiles.length).toBeGreaterThanOrEqual(1);
    const sql = sqlFiles.map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
    expect(sql).toContain('CREATE TABLE "users"');
    expect(sql).toContain("library_entries_rating_check");
    expect(sql).toContain('REFERENCES "public"."users"("id")');
  });
});

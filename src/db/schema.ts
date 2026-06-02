/**
 * PostgreSQL schema for LibraryLoop (DL-14), defined with Drizzle ORM.
 *
 * Mirrors .sdd/specs/home-feed/design.md: a single `users` table for both
 * authenticating members and feed-only community actors, credentials split
 * into `auth_identities` (SSO-ready), revocable `sessions`, and the media /
 * library / activity / preferences tables. Inferred row types are exported for
 * the data-access layer (DL-15).
 */
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { MediaItemMetadata, Preferences } from "@/lib/types/domain";

/** Members (can authenticate) and community actors (feed-only) share one table. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    // Nullable: community actors have no email. Unique among non-null values.
    email: text("email"),
    avatarColor: text("avatar_color").notNull(),
    // Optional profile picture URL (https) — populated from Google sign-in
    // (google-auth Req 9); null for email/password members.
    avatarUrl: text("avatar_url"),
    bio: text("bio").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("users_email_unique").on(t.email),
    check("users_kind_check", sql`${t.kind} in ('member', 'community')`),
  ],
);

/** One row per authentication provider per user; SSO (google) slots in here later. */
export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id"),
    passwordHash: text("password_hash"),
  },
  (t) => [
    unique("auth_identities_provider_account_unique").on(t.provider, t.providerAccountId),
    // One identity per provider per user (a user can't have two password rows).
    unique("auth_identities_user_provider_unique").on(t.userId, t.provider),
    check("auth_identities_provider_check", sql`${t.provider} in ('password', 'google')`),
    // Provider-specific shape: password rows carry a hash and no external id;
    // google (future SSO) rows carry an external account id and no hash.
    check(
      "auth_identities_shape_check",
      sql`(
        (${t.provider} = 'password' and ${t.passwordHash} is not null and ${t.providerAccountId} is null)
        or
        (${t.provider} = 'google' and ${t.providerAccountId} is not null and ${t.passwordHash} is null)
      )`,
    ),
  ],
);

/** Server-validated sessions; the cookie carries an opaque token, only its hash is stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_id_idx").on(t.userId),
  ],
);

/** Shared catalog. `type` is an open string set (default ebook) so new media types need no schema change. */
export const mediaItems = pgTable("media_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull().default("ebook"),
  title: text("title").notNull(),
  creator: text("creator").notNull(),
  genre: text("genre").notNull(),
  language: text("language").notNull().default("English"),
  description: text("description").notNull().default(""),
  coverTheme: text("cover_theme").notNull().default("teal"),
  // Real cover image URL (https) when known; null ⇒ themed placeholder (cover-art Req 2.1).
  artworkUrl: text("artwork_url"),
  // When cover resolution was last attempted; null ⇒ never attempted, so the
  // item is eligible for resolution and the lookup is not repeated once set
  // (cover-art Req 4.5).
  artworkCheckedAt: timestamp("artwork_checked_at", { withTimezone: true }),
  // Type-specific extras (album, episode count, …); null for legacy/unknown
  // types (media-platform-v2 Req 1.1, 1.4). Validated into the domain union.
  metadata: jsonb("metadata").$type<MediaItemMetadata>(),
  // Total consumable units (pages/episodes/runtime) backing progress (Req 3.1).
  totalUnits: integer("total_units"),
}, (t) => [
  // Atomic de-dup key (DL-64): one catalog row per type + case-insensitive
  // title/creator, so concurrent find-or-create can't insert duplicates.
  uniqueIndex("media_items_type_title_creator_key").on(
    t.type,
    sql`lower(${t.title})`,
    sql`lower(${t.creator})`,
  ),
]);

export const libraryEntries = pgTable(
  "library_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    rating: integer("rating"),
    review: text("review").notNull().default(""),
    // Consumption progress (e.g. pages read); null when not tracked (Req 3.1).
    progress: integer("progress"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("library_entries_user_media_unique").on(t.userId, t.mediaItemId),
    check("library_entries_status_check", sql`${t.status} in ('wishlist', 'current', 'finished')`),
    check(
      "library_entries_rating_check",
      sql`${t.rating} is null or (${t.rating} >= 1 and ${t.rating} <= 5)`,
    ),
    check("library_entries_progress_check", sql`${t.progress} is null or ${t.progress} >= 0`),
  ],
);

/** User-scoped, free-form tags on a library entry (media-platform-v2 Req 2). */
export const libraryEntryTags = pgTable(
  "library_entry_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => libraryEntries.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [
    unique("library_entry_tags_entry_tag_unique").on(t.entryId, t.tag),
    index("library_entry_tags_entry_id_idx").on(t.entryId),
  ],
);

/** One active periodic reading goal per user/period/period-key (Req 4). */
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    periodKey: text("period_key").notNull(),
    targetCount: integer("target_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("goals_user_period_key_unique").on(t.userId, t.period, t.periodKey),
    check("goals_target_count_check", sql`${t.targetCount} >= 1`),
  ],
);

/** Persisted achievement unlocks per user; one row per first unlock (Req 6). */
export const userAchievements = pgTable(
  "user_achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementKey: text("achievement_key").notNull(),
    achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("user_achievements_user_key_unique").on(t.userId, t.achievementKey),
    index("user_achievements_user_id_idx").on(t.userId),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    detail: text("detail").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "activities_action_check",
      sql`${t.action} in ('added', 'started', 'finished', 'reviewed')`,
    ),
    index("activities_created_at_idx").on(t.createdAt),
  ],
);

/** 1:1 with a user; nested per-media-type preference blobs typed to the shared Preferences type. */
export const preferences = pgTable("preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  books: jsonb("books").$type<Preferences["books"]>().notNull(),
  music: jsonb("music").$type<Preferences["music"]>().notNull(),
  podcasts: jsonb("podcasts").$type<Preferences["podcasts"]>().notNull(),
  streaming: jsonb("streaming").$type<Preferences["streaming"]>().notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type AuthIdentityRow = typeof authIdentities.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type MediaItemRow = typeof mediaItems.$inferSelect;
export type LibraryEntryRow = typeof libraryEntries.$inferSelect;
export type ActivityRow = typeof activities.$inferSelect;
export type PreferencesRow = typeof preferences.$inferSelect;
export type LibraryEntryTagRow = typeof libraryEntryTags.$inferSelect;
export type GoalRow = typeof goals.$inferSelect;
export type NewGoalRow = typeof goals.$inferInsert;
export type UserAchievementRow = typeof userAchievements.$inferSelect;

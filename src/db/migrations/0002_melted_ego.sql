-- DL-64: reconcile any pre-existing duplicate media rows, then enforce a
-- case-insensitive unique key on (type, title, creator). The keeper per group
-- is the lexicographically smallest id; references are repointed to it and the
-- duplicate rows removed before the unique index is created.

-- Repoint activities from duplicate media rows to their keeper.
UPDATE "activities" AS a
SET "media_item_id" = k."keeper"
FROM (
  SELECT "id",
         first_value("id") OVER (
           PARTITION BY "type", lower("title"), lower("creator") ORDER BY "id"
         ) AS "keeper"
  FROM "media_items"
) AS k
WHERE a."media_item_id" = k."id" AND k."id" <> k."keeper";
--> statement-breakpoint

-- The keeper entry per (user, natural-key group): the most meaningful entry
-- (finished > current > wishlist, then most recently updated), not an arbitrary
-- id. Used to both preserve tags and collapse duplicate entries below.
-- Defined inline in each statement since plain SQL migrations have no CTE scope
-- spanning statement breakpoints.

-- Preserve tags from the entries we're about to collapse: copy them onto the
-- surviving entry first, since the DELETE's cascade would otherwise drop them.
-- ON CONFLICT keeps it idempotent when the survivor already has the same tag.
INSERT INTO "library_entry_tags" ("entry_id", "tag")
SELECT d."keeper_entry", t."tag"
FROM "library_entry_tags" AS t
JOIN (
  SELECT le2."id",
         first_value(le2."id") OVER (
           PARTITION BY le2."user_id", m."type", lower(m."title"), lower(m."creator")
           ORDER BY
             CASE le2."status" WHEN 'finished' THEN 0 WHEN 'current' THEN 1 ELSE 2 END,
             le2."updated_at" DESC,
             le2."id"
         ) AS "keeper_entry"
  FROM "library_entries" AS le2
  JOIN "media_items" AS m ON m."id" = le2."media_item_id"
) AS d ON d."id" = t."entry_id"
WHERE d."id" <> d."keeper_entry"
ON CONFLICT ("entry_id", "tag") DO NOTHING;
--> statement-breakpoint

-- Collapse each user's library entries down to one survivor per natural-key
-- group, so repointing to the keeper below can't violate the unique
-- (user_id, media_item_id). This also covers a user who owns two or more
-- non-keeper duplicates but none on the keeper. Cascades remove the dropped
-- entries' tags (already copied to the survivor above).
DELETE FROM "library_entries" AS le
USING (
  SELECT le2."id",
         first_value(le2."id") OVER (
           PARTITION BY le2."user_id", m."type", lower(m."title"), lower(m."creator")
           ORDER BY
             CASE le2."status" WHEN 'finished' THEN 0 WHEN 'current' THEN 1 ELSE 2 END,
             le2."updated_at" DESC,
             le2."id"
         ) AS "keeper_entry"
  FROM "library_entries" AS le2
  JOIN "media_items" AS m ON m."id" = le2."media_item_id"
) AS d
WHERE le."id" = d."id" AND d."id" <> d."keeper_entry";
--> statement-breakpoint

-- Repoint the remaining library entries to the keeper.
UPDATE "library_entries" AS le
SET "media_item_id" = k."keeper"
FROM (
  SELECT "id",
         first_value("id") OVER (
           PARTITION BY "type", lower("title"), lower("creator") ORDER BY "id"
         ) AS "keeper"
  FROM "media_items"
) AS k
WHERE le."media_item_id" = k."id" AND k."id" <> k."keeper";
--> statement-breakpoint

-- Remove the now-unreferenced duplicate media rows.
DELETE FROM "media_items" AS m
USING (
  SELECT "id",
         first_value("id") OVER (
           PARTITION BY "type", lower("title"), lower("creator") ORDER BY "id"
         ) AS "keeper"
  FROM "media_items"
) AS k
WHERE m."id" = k."id" AND k."id" <> k."keeper";
--> statement-breakpoint

CREATE UNIQUE INDEX "media_items_type_title_creator_key" ON "media_items" USING btree ("type",lower("title"),lower("creator"));

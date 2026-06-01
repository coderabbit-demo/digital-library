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

-- Collapse each user's library entries down to one survivor per natural-key
-- group, so repointing to the keeper below can't violate the unique
-- (user_id, media_item_id). This also covers a user who owns two or more
-- non-keeper duplicates but none on the keeper. The survivor is the most
-- meaningful entry (finished > current > wishlist, then most recently updated),
-- not an arbitrary id. Cascades remove the dropped entries' tags.
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

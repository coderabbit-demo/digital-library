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

-- Drop duplicate library entries that would collide with the keeper for the
-- same user (the unique (user_id, media_item_id) would otherwise be violated).
-- Cascades remove their entry tags.
DELETE FROM "library_entries" AS le
USING (
  SELECT "id",
         first_value("id") OVER (
           PARTITION BY "type", lower("title"), lower("creator") ORDER BY "id"
         ) AS "keeper"
  FROM "media_items"
) AS k
WHERE le."media_item_id" = k."id" AND k."id" <> k."keeper"
  AND EXISTS (
    SELECT 1 FROM "library_entries" AS le2
    WHERE le2."user_id" = le."user_id" AND le2."media_item_id" = k."keeper"
  );
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

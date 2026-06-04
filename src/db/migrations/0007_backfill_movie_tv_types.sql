-- Custom SQL migration file, put your code below! --

-- movie-tv-types (DL-89): reclassify legacy combined `tv_movie` rows into the
-- first-class `movie` and `tv` types. Priority: the resolved TMDB type from
-- prior enrichment, then a season-count hint (from enrichment or metadata), then
-- a documented default of `movie`. Only the `type` column changes, so each
-- item's library entries, reviews, tags, activity, and cover are preserved.
-- Re-running is a no-op once no `tv_movie` rows remain.
UPDATE "media_items" SET "type" = CASE
  WHEN "enrichment"->>'tmdbType' = 'tv'     THEN 'tv'
  WHEN "enrichment"->>'tmdbType' = 'movie'  THEN 'movie'
  WHEN "enrichment"->>'seasons' IS NOT NULL THEN 'tv'
  WHEN "metadata"->>'seasons' IS NOT NULL   THEN 'tv'
  ELSE 'movie'
END
WHERE "type" = 'tv_movie';
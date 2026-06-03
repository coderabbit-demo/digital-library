ALTER TABLE "media_items" ADD COLUMN "enrichment" jsonb;--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "enrichment_checked_at" timestamp with time zone;
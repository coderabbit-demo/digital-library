CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period" text NOT NULL,
	"period_key" text NOT NULL,
	"target_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_user_period_key_unique" UNIQUE("user_id","period","period_key"),
	CONSTRAINT "goals_target_count_check" CHECK ("goals"."target_count" >= 1)
);
--> statement-breakpoint
CREATE TABLE "library_entry_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"tag" text NOT NULL,
	CONSTRAINT "library_entry_tags_entry_tag_unique" UNIQUE("entry_id","tag")
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_key" text NOT NULL,
	"achieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievements_user_key_unique" UNIQUE("user_id","achievement_key")
);
--> statement-breakpoint
ALTER TABLE "library_entries" ADD COLUMN "progress" integer;--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "total_units" integer;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_entry_tags" ADD CONSTRAINT "library_entry_tags_entry_id_library_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."library_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "library_entry_tags_entry_id_idx" ON "library_entry_tags" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_progress_check" CHECK ("library_entries"."progress" is null or "library_entries"."progress" >= 0);
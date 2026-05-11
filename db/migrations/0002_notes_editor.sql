ALTER TABLE "events" ADD COLUMN "notes_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "notes_editor_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_notes_editor_id_users_id_fk" FOREIGN KEY ("notes_editor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
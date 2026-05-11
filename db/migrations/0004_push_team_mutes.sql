CREATE TABLE IF NOT EXISTS "push_team_mutes" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "push_team_mutes_user_team_unique" UNIQUE ("user_id", "team_id")
);

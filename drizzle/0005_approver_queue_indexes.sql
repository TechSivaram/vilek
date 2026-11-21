CREATE INDEX IF NOT EXISTS "claim_status_created_idx" ON "Claim" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_status_updated_idx" ON "Claim" ("status", "updated_at");

ALTER TABLE "Claim_Comment" ADD COLUMN "parent_comment_id" text;
--> statement-breakpoint
CREATE INDEX "claim_comment_parent_idx" ON "Claim_Comment" ("parent_comment_id");

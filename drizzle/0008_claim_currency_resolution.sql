CREATE TABLE `Claim_Currency_Resolution` (
 `id` text PRIMARY KEY NOT NULL,
 `claim_id` text NOT NULL UNIQUE,
 `payout_currency_code` text NOT NULL,
 `rates_json` text NOT NULL,
 `converted_amount` text NOT NULL,
 `rate_source` text NOT NULL,
 `effective_date` text NOT NULL,
 `status` text DEFAULT 'APPROVED' NOT NULL,
 `created_by_user_id` text,
 `approved_by_user_id` text,
 `approved_at` text,
 `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
 `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
 FOREIGN KEY (`claim_id`) REFERENCES `Claim`(`id`) ON UPDATE no action ON DELETE restrict,
 FOREIGN KEY (`payout_currency_code`) REFERENCES `Currency`(`code`) ON UPDATE no action ON DELETE restrict,
 FOREIGN KEY (`created_by_user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null,
 FOREIGN KEY (`approved_by_user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null,
 CONSTRAINT `claim_currency_resolution_status_ck` CHECK (`status` IN ('DRAFT','APPROVED')),
 CONSTRAINT `claim_currency_resolution_amount_ck` CHECK (CAST(`converted_amount` AS REAL) > 0)
);

--> statement-breakpoint
CREATE TABLE `Claim_Currency_Resolution_Audit_Event` (
 `id` text PRIMARY KEY NOT NULL,
 `resolution_id` text NOT NULL,
 `claim_id` text NOT NULL,
 `actor_user_id` text,
 `action` text NOT NULL,
 `details_json` text NOT NULL,
 `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
 FOREIGN KEY (`resolution_id`) REFERENCES `Claim_Currency_Resolution`(`id`) ON UPDATE no action ON DELETE restrict,
 FOREIGN KEY (`claim_id`) REFERENCES `Claim`(`id`) ON UPDATE no action ON DELETE restrict,
 FOREIGN KEY (`actor_user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `claim_currency_resolution_audit_idx` ON `Claim_Currency_Resolution_Audit_Event` (`claim_id`,`created_at`);

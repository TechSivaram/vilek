CREATE TABLE `Crew_Bank_Account` (
 `id` text PRIMARY KEY NOT NULL,
 `crew_member_id` text NOT NULL,
 `account_holder_name` text NOT NULL,
 `bank_name` text NOT NULL,
 `country_code` text NOT NULL,
 `currency_code` text NOT NULL,
 `account_number_encrypted` text NOT NULL,
 `account_number_last4` text NOT NULL,
 `routing_code_encrypted` text,
 `routing_code_masked` text,
 `verification_status` text DEFAULT 'PENDING' NOT NULL,
 `verification_method` text,
 `verification_reference` text,
 `is_primary` integer DEFAULT false NOT NULL,
 `is_active` integer DEFAULT true NOT NULL,
 `verified_at` text,
 `verified_by_user_id` text,
 `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
 `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
 FOREIGN KEY (`crew_member_id`) REFERENCES `Crew_Member`(`id`) ON UPDATE no action ON DELETE restrict,
 FOREIGN KEY (`currency_code`) REFERENCES `Currency`(`code`) ON UPDATE no action ON DELETE restrict,
 FOREIGN KEY (`verified_by_user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null,
 CONSTRAINT `crew_bank_account_verification_ck` CHECK (`verification_status` IN ('PENDING','VERIFIED','REJECTED','NEEDS_REVIEW'))
);
--> statement-breakpoint
CREATE INDEX `crew_bank_account_crew_idx` ON `Crew_Bank_Account` (`crew_member_id`,`is_active`);
--> statement-breakpoint
CREATE UNIQUE INDEX `crew_bank_account_primary_uq` ON `Crew_Bank_Account` (`crew_member_id`,`is_primary`) WHERE `is_primary` = 1;
--> statement-breakpoint
CREATE TABLE `Crew_Bank_Account_Audit_Event` (
 `id` text PRIMARY KEY NOT NULL,
 `bank_account_id` text NOT NULL,
 `actor_user_id` text,
 `action` text NOT NULL,
 `details_json` text,
 `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
 FOREIGN KEY (`bank_account_id`) REFERENCES `Crew_Bank_Account`(`id`) ON UPDATE no action ON DELETE restrict,
 FOREIGN KEY (`actor_user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `crew_bank_account_audit_date_idx` ON `Crew_Bank_Account_Audit_Event` (`bank_account_id`,`created_at`);

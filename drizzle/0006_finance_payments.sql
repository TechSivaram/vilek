CREATE TABLE `Payment` (
  `id` text PRIMARY KEY NOT NULL,
  `payment_number` text NOT NULL UNIQUE,
  `mode` text NOT NULL,
  `status` text DEFAULT 'PROCESSING' NOT NULL,
  `currency_code` text NOT NULL,
  `amount` text NOT NULL,
  `payment_reference` text,
  `provider_reference` text,
  `idempotency_key` text NOT NULL UNIQUE,
  `initiated_by_user_id` text,
  `paid_at` text,
  `failure_reason` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`initiated_by_user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null,
  CONSTRAINT `payment_mode_ck` CHECK (`mode` IN ('MANUAL', 'BANK')),
  CONSTRAINT `payment_status_ck` CHECK (`status` IN ('PROCESSING', 'PAID', 'FAILED')),
  CONSTRAINT `payment_amount_ck` CHECK (CAST(`amount` AS REAL) > 0)
);
--> statement-breakpoint
CREATE INDEX `payment_status_created_idx` ON `Payment` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `payment_mode_created_idx` ON `Payment` (`mode`,`created_at`);
--> statement-breakpoint
CREATE TABLE `Payment_Claim` (
  `id` text PRIMARY KEY NOT NULL,
  `payment_id` text NOT NULL,
  `claim_id` text NOT NULL,
  `amount` text NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`payment_id`) REFERENCES `Payment`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`claim_id`) REFERENCES `Claim`(`id`) ON UPDATE no action ON DELETE restrict,
  CONSTRAINT `payment_claim_amount_ck` CHECK (CAST(`amount` AS REAL) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_claim_payment_claim_uq` ON `Payment_Claim` (`payment_id`,`claim_id`);
--> statement-breakpoint
CREATE INDEX `payment_claim_claim_idx` ON `Payment_Claim` (`claim_id`);
--> statement-breakpoint
CREATE TABLE `Payment_Audit_Event` (
  `id` text PRIMARY KEY NOT NULL,
  `payment_id` text NOT NULL,
  `action` text NOT NULL,
  `details_json` text,
  `actor_user_id` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`payment_id`) REFERENCES `Payment`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`actor_user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `payment_audit_payment_date_idx` ON `Payment_Audit_Event` (`payment_id`,`created_at`);

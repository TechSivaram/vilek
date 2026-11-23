CREATE TABLE `Crew_Bank_Account_Evidence` (
  `id` text PRIMARY KEY NOT NULL,
  `bank_account_id` text NOT NULL,
  `storage_key` text NOT NULL,
  `file_name` text NOT NULL,
  `content_type` text NOT NULL,
  `file_size_bytes` integer NOT NULL,
  `evidence_type` text NOT NULL,
  `uploaded_by_user_id` text NOT NULL,
  `uploaded_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  FOREIGN KEY (`bank_account_id`) REFERENCES `Crew_Bank_Account`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict,
  CONSTRAINT `crew_bank_account_evidence_type_ck` CHECK (`evidence_type` IN ('CANCELLED_CHEQUE','BANK_PASSBOOK','BANK_STATEMENT')),
  CONSTRAINT `crew_bank_account_evidence_size_ck` CHECK (`file_size_bytes` > 0 AND `file_size_bytes` <= 10485760)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crew_bank_account_evidence_storage_uq` ON `Crew_Bank_Account_Evidence` (`storage_key`);
--> statement-breakpoint
CREATE INDEX `crew_bank_account_evidence_account_idx` ON `Crew_Bank_Account_Evidence` (`bank_account_id`,`uploaded_at`);

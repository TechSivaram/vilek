PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `User_new` (
  `id` text PRIMARY KEY NOT NULL,
  `oidc_subject` text,
  `scim_id` text,
  `email` text NOT NULL,
  `first_name` text NOT NULL,
  `last_name` text NOT NULL,
  `date_of_birth` text,
  `gender_id` integer,
  `is_active` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`gender_id`) REFERENCES `Gender`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `User_new` (`id`, `oidc_subject`, `scim_id`, `email`, `first_name`, `last_name`, `date_of_birth`, `gender_id`, `is_active`, `created_at`, `updated_at`)
SELECT `id`, CASE WHEN `oidc_subject` LIKE 'scim-pending:%' THEN NULL ELSE `oidc_subject` END,
       CASE WHEN `oidc_subject` LIKE 'scim-pending:%' THEN substr(`oidc_subject`, length('scim-pending:') + 1) ELSE NULL END,
       `email`, `first_name`, `last_name`, `date_of_birth`, `gender_id`, `is_active`, `created_at`, `updated_at`
FROM `User`;
--> statement-breakpoint
DROP TABLE `User`;
--> statement-breakpoint
ALTER TABLE `User_new` RENAME TO `User`;
--> statement-breakpoint
CREATE UNIQUE INDEX `User_oidc_subject_unique` ON `User` (`oidc_subject`);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_scim_id_unique` ON `User` (`scim_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_unique` ON `User` (`email`);
--> statement-breakpoint
CREATE INDEX `user_name_idx` ON `User` (`last_name`,`first_name`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;

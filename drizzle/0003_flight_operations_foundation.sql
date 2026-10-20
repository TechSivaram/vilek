ALTER TABLE `Flight` ADD COLUMN `status` text NOT NULL DEFAULT 'SCHEDULED' CHECK (`status` IN ('SCHEDULED', 'BOARDING', 'DEPARTED', 'COMPLETED', 'CANCELLED'));
--> statement-breakpoint
CREATE TABLE `Crew_Member_Designation` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `crew_member_id` text NOT NULL,
  `designation_id` integer NOT NULL,
  `valid_from` text,
  `valid_until` text,
  `is_active` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`crew_member_id`) REFERENCES `Crew_Member`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`designation_id`) REFERENCES `Crew_Designation`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `crew_member_designation_dates_ck` CHECK (`valid_until` IS NULL OR `valid_from` IS NULL OR `valid_until` >= `valid_from`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crew_member_designation_pair_uq` ON `Crew_Member_Designation` (`crew_member_id`,`designation_id`);
--> statement-breakpoint
CREATE INDEX `crew_member_designation_eligibility_idx` ON `Crew_Member_Designation` (`designation_id`,`is_active`,`crew_member_id`);
--> statement-breakpoint
CREATE TABLE `Qualification_Type` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `code` text NOT NULL,
  `name` text NOT NULL,
  `expiry_required` integer DEFAULT true NOT NULL,
  `is_active` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Qualification_Type_code_unique` ON `Qualification_Type` (`code`);
--> statement-breakpoint
CREATE TABLE `Crew_Qualification` (
  `id` text PRIMARY KEY NOT NULL,
  `crew_member_id` text NOT NULL,
  `qualification_type_id` integer NOT NULL,
  `valid_from` text NOT NULL,
  `valid_until` text,
  `status` text DEFAULT 'ACTIVE' NOT NULL,
  `replaced_by_id` text,
  `notes` text,
  `created_by_user_id` text,
  `updated_by_user_id` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`crew_member_id`) REFERENCES `Crew_Member`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`qualification_type_id`) REFERENCES `Qualification_Type`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `crew_qualification_status_ck` CHECK (`status` IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  CONSTRAINT `crew_qualification_dates_ck` CHECK (`valid_until` IS NULL OR `valid_until` >= `valid_from`)
);
--> statement-breakpoint
CREATE INDEX `crew_qualification_crew_type_idx` ON `Crew_Qualification` (`crew_member_id`,`qualification_type_id`,`status`);
--> statement-breakpoint
CREATE INDEX `crew_qualification_valid_until_idx` ON `Crew_Qualification` (`valid_until`,`status`);
--> statement-breakpoint
CREATE TABLE `Designation_Qualification_Requirement` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `designation_id` integer NOT NULL,
  `qualification_type_id` integer NOT NULL,
  `is_required` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`designation_id`) REFERENCES `Crew_Designation`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`qualification_type_id`) REFERENCES `Qualification_Type`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX `designation_qualification_requirement_uq` ON `Designation_Qualification_Requirement` (`designation_id`,`qualification_type_id`);
--> statement-breakpoint
CREATE TABLE `Flight_Crew_Complement_Default` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `designation_id` integer NOT NULL,
  `required_count` integer NOT NULL,
  `updated_by_user_id` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`designation_id`) REFERENCES `Crew_Designation`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`updated_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `flight_crew_complement_default_count_ck` CHECK (`required_count` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flight_crew_complement_default_designation_uq` ON `Flight_Crew_Complement_Default` (`designation_id`);
--> statement-breakpoint
CREATE TABLE `Flight_Crew_Requirement` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `flight_id` text NOT NULL,
  `designation_id` integer NOT NULL,
  `required_count` integer NOT NULL,
  `reason` text,
  `created_by_user_id` text,
  `updated_by_user_id` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`flight_id`) REFERENCES `Flight`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`designation_id`) REFERENCES `Crew_Designation`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `flight_crew_requirement_count_ck` CHECK (`required_count` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flight_crew_requirement_flight_designation_uq` ON `Flight_Crew_Requirement` (`flight_id`,`designation_id`);
--> statement-breakpoint
CREATE INDEX `flight_crew_requirement_flight_idx` ON `Flight_Crew_Requirement` (`flight_id`);
--> statement-breakpoint
CREATE TABLE `Flight_Operations_Setting` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `setting_key` text NOT NULL,
  `value_json` text NOT NULL,
  `description` text,
  `updated_by_user_id` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`updated_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Flight_Operations_Setting_setting_key_unique` ON `Flight_Operations_Setting` (`setting_key`);
--> statement-breakpoint
CREATE TABLE `Flight_Crew_Audit_Event` (
  `id` text PRIMARY KEY NOT NULL,
  `flight_id` text NOT NULL,
  `flight_number_snapshot` text,
  `crew_member_id` text,
  `crew_name_snapshot` text,
  `designation_id` integer,
  `designation_snapshot` text,
  `assignment_id` text,
  `action` text NOT NULL,
  `previous_value_json` text,
  `new_value_json` text,
  `reason` text,
  `actor_user_id` text,
  `actor_email_snapshot` text,
  `correlation_id` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`actor_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `flight_crew_audit_flight_date_idx` ON `Flight_Crew_Audit_Event` (`flight_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `flight_crew_audit_crew_date_idx` ON `Flight_Crew_Audit_Event` (`crew_member_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `flight_crew_audit_action_date_idx` ON `Flight_Crew_Audit_Event` (`action`,`created_at`);
--> statement-breakpoint
CREATE INDEX `flight_crew_audit_actor_date_idx` ON `Flight_Crew_Audit_Event` (`actor_user_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `Qualification_Alert` (
  `id` text PRIMARY KEY NOT NULL,
  `crew_qualification_id` text NOT NULL,
  `alert_interval_days` integer NOT NULL,
  `due_at` text NOT NULL,
  `state` text DEFAULT 'PENDING' NOT NULL,
  `generated_at` text,
  `resolved_at` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`crew_qualification_id`) REFERENCES `Crew_Qualification`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `qualification_alert_interval_ck` CHECK (`alert_interval_days` >= 0),
  CONSTRAINT `qualification_alert_state_ck` CHECK (`state` IN ('PENDING', 'SENT', 'RESOLVED', 'CANCELLED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `qualification_alert_interval_uq` ON `Qualification_Alert` (`crew_qualification_id`,`alert_interval_days`);
--> statement-breakpoint
CREATE INDEX `qualification_alert_state_due_idx` ON `Qualification_Alert` (`state`,`due_at`);
--> statement-breakpoint
CREATE TABLE `Flight_Crew_Batch_Request` (
  `id` text PRIMARY KEY NOT NULL,
  `idempotency_key` text NOT NULL,
  `requested_by_user_id` text,
  `request_hash` text NOT NULL,
  `state` text DEFAULT 'PROCESSING' NOT NULL,
  `result_json` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  `completed_at` text,
  FOREIGN KEY (`requested_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `flight_crew_batch_request_state_ck` CHECK (`state` IN ('PROCESSING', 'SUCCEEDED', 'FAILED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Flight_Crew_Batch_Request_idempotency_key_unique` ON `Flight_Crew_Batch_Request` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `flight_crew_batch_request_state_idx` ON `Flight_Crew_Batch_Request` (`state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `Audit_Export_Event` (
  `id` text PRIMARY KEY NOT NULL,
  `actor_user_id` text,
  `filters_json` text NOT NULL,
  `row_count` integer DEFAULT 0 NOT NULL,
  `format` text DEFAULT 'CSV' NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`actor_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `audit_export_row_count_ck` CHECK (`row_count` >= 0)
);
--> statement-breakpoint
CREATE INDEX `audit_export_actor_date_idx` ON `Audit_Export_Event` (`actor_user_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `Audit_Retention_Policy` (
  `id` integer PRIMARY KEY NOT NULL,
  `retention_days` integer,
  `updated_by_user_id` text,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`updated_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `audit_retention_single_row_ck` CHECK (`id` = 1),
  CONSTRAINT `audit_retention_days_ck` CHECK (`retention_days` IS NULL OR `retention_days` > 0)
);
--> statement-breakpoint
CREATE TABLE `Audit_Retention_Action` (
  `id` text PRIMARY KEY NOT NULL,
  `actor_user_id` text,
  `action` text NOT NULL,
  `cutoff_at` text NOT NULL,
  `affected_count` integer DEFAULT 0 NOT NULL,
  `details_json` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  FOREIGN KEY (`actor_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `audit_retention_affected_count_ck` CHECK (`affected_count` >= 0)
);
--> statement-breakpoint
CREATE INDEX `audit_retention_action_date_idx` ON `Audit_Retention_Action` (`created_at`);

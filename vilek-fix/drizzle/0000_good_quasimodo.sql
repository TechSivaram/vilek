CREATE TABLE `Airline` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`iata_code` text NOT NULL,
	`icao_code` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	CONSTRAINT "airline_iata_length_ck" CHECK(length("Airline"."iata_code") = 2),
	CONSTRAINT "airline_icao_length_ck" CHECK(length("Airline"."icao_code") = 3)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Airline_iata_code_unique` ON `Airline` (`iata_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `Airline_icao_code_unique` ON `Airline` (`icao_code`);--> statement-breakpoint
CREATE TABLE `Airport` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`iata_code` text NOT NULL,
	`icao_code` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`country` text NOT NULL,
	`time_zone` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	CONSTRAINT "airport_iata_length_ck" CHECK(length("Airport"."iata_code") = 3),
	CONSTRAINT "airport_icao_length_ck" CHECK(length("Airport"."icao_code") = 4)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Airport_iata_code_unique` ON `Airport` (`iata_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `Airport_icao_code_unique` ON `Airport` (`icao_code`);--> statement-breakpoint
CREATE TABLE `Allowed_File_Type` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`system_setting_id` integer NOT NULL,
	`file_type` text NOT NULL,
	FOREIGN KEY (`system_setting_id`) REFERENCES `System_Setting`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `allowed_file_type_setting_type_uq` ON `Allowed_File_Type` (`system_setting_id`,`file_type`);--> statement-breakpoint
CREATE TABLE `Audit_Outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_json` text NOT NULL,
	`correlation_id` text,
	`actor_user_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`processed_at` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text,
	`last_error` text,
	FOREIGN KEY (`actor_user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_outbox_pending_idx` ON `Audit_Outbox` (`processed_at`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `audit_outbox_entity_idx` ON `Audit_Outbox` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `Claim_Comment` (
	`id` text PRIMARY KEY NOT NULL,
	`claim_id` text NOT NULL,
	`user_id` text NOT NULL,
	`comment` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`claim_id`) REFERENCES `Claim`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `claim_comment_claim_idx` ON `Claim_Comment` (`claim_id`);--> statement-breakpoint
CREATE TABLE `Claim_Expense` (
	`id` text PRIMARY KEY NOT NULL,
	`claim_id` text NOT NULL,
	`expense_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`claim_id`) REFERENCES `Claim`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`expense_id`) REFERENCES `Expense`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Claim_Expense_expense_id_unique` ON `Claim_Expense` (`expense_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `claim_expense_claim_expense_uq` ON `Claim_Expense` (`claim_id`,`expense_id`);--> statement-breakpoint
CREATE TABLE `Claim` (
	`id` text PRIMARY KEY NOT NULL,
	`flight_crew_id` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`flight_crew_id`) REFERENCES `Flight_Crew`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Claim_flight_crew_id_unique` ON `Claim` (`flight_crew_id`);--> statement-breakpoint
CREATE INDEX `claim_status_idx` ON `Claim` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `claim_id_assignment_uq` ON `Claim` (`id`,`flight_crew_id`);--> statement-breakpoint
CREATE TABLE `Crew_Designation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Crew_Designation_code_unique` ON `Crew_Designation` (`code`);--> statement-breakpoint
CREATE TABLE `Crew_Member` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`badge_number` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Crew_Member_user_id_unique` ON `Crew_Member` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `Crew_Member_badge_number_unique` ON `Crew_Member` (`badge_number`);--> statement-breakpoint
CREATE TABLE `Currency` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`minor_units` integer DEFAULT 2 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	CONSTRAINT "currency_minor_units_ck" CHECK("Currency"."minor_units" BETWEEN 0 AND 4)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Currency_code_unique` ON `Currency` (`code`);--> statement-breakpoint
CREATE TABLE `Deployment_Setup` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`setup_completed_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	CONSTRAINT "deployment_setup_single_row_ck" CHECK("Deployment_Setup"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `Expense_Category` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Expense_Category_code_unique` ON `Expense_Category` (`code`);--> statement-breakpoint
CREATE TABLE `Expense_Document` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`document_type` text NOT NULL,
	`storage_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`file_size_bytes` integer NOT NULL,
	`uploaded_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `Expense`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "expense_document_size_ck" CHECK("Expense_Document"."file_size_bytes" >= 0)
);
--> statement-breakpoint
CREATE INDEX `expense_document_expense_idx` ON `Expense_Document` (`expense_id`);--> statement-breakpoint
CREATE TABLE `Expense` (
	`id` text PRIMARY KEY NOT NULL,
	`flight_crew_id` text NOT NULL,
	`amount` text NOT NULL,
	`original_currency_id` integer NOT NULL,
	`expense_date` text NOT NULL,
	`location` text,
	`category_id` integer NOT NULL,
	`description` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`flight_crew_id`) REFERENCES `Flight_Crew`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`original_currency_id`) REFERENCES `Currency`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `Expense_Category`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "expense_amount_decimal_ck" CHECK(CAST("Expense"."amount" AS REAL) >= 0)
);
--> statement-breakpoint
CREATE INDEX `expense_assignment_date_idx` ON `Expense` (`flight_crew_id`,`expense_date`);--> statement-breakpoint
CREATE TABLE `Flight_Crew` (
	`id` text PRIMARY KEY NOT NULL,
	`flight_id` text NOT NULL,
	`crew_member_id` text NOT NULL,
	`designation_id` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`flight_id`) REFERENCES `Flight`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`crew_member_id`) REFERENCES `Crew_Member`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`designation_id`) REFERENCES `Crew_Designation`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flight_crew_flight_member_uq` ON `Flight_Crew` (`flight_id`,`crew_member_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `flight_crew_id_assignment_uq` ON `Flight_Crew` (`id`,`flight_id`,`crew_member_id`);--> statement-breakpoint
CREATE TABLE `Flight` (
	`id` text PRIMARY KEY NOT NULL,
	`airline_id` integer NOT NULL,
	`flight_number` text NOT NULL,
	`origin_airport_id` integer NOT NULL,
	`destination_airport_id` integer NOT NULL,
	`scheduled_departure` text NOT NULL,
	`scheduled_arrival` text NOT NULL,
	`actual_departure` text,
	`actual_arrival` text,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`airline_id`) REFERENCES `Airline`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`origin_airport_id`) REFERENCES `Airport`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`destination_airport_id`) REFERENCES `Airport`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `flight_departure_idx` ON `Flight` (`scheduled_departure`);--> statement-breakpoint
CREATE INDEX `flight_number_idx` ON `Flight` (`airline_id`,`flight_number`);--> statement-breakpoint
CREATE TABLE `Gender` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Gender_code_unique` ON `Gender` (`code`);--> statement-breakpoint
CREATE TABLE `Notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`read_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_user_unread_idx` ON `Notification` (`user_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `Role` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Role_code_unique` ON `Role` (`code`);--> statement-breakpoint
CREATE TABLE `System_Setting` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`default_currency_id` integer NOT NULL,
	`max_upload_size_bytes` integer DEFAULT 10485760 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`default_currency_id`) REFERENCES `Currency`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "system_setting_single_row_ck" CHECK("System_Setting"."id" = 1),
	CONSTRAINT "system_setting_upload_size_ck" CHECK("System_Setting"."max_upload_size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE `User_Role` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`role_id` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `Role`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_role_user_role_uq` ON `User_Role` (`user_id`,`role_id`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`oidc_subject` text NOT NULL,
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
CREATE UNIQUE INDEX `User_oidc_subject_unique` ON `User` (`oidc_subject`);--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_unique` ON `User` (`email`);--> statement-breakpoint
CREATE INDEX `user_name_idx` ON `User` (`last_name`,`first_name`);
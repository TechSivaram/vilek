import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";

// ViLek's finalized 21-entity schema. Dates/times are ISO-8601 text; money is
// stored as SQLite REAL to mirror DECIMAL(18,2) until a PostgreSQL migration.
const createdAt = (name = "created_at") =>
  text(name)
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);
const updatedAt = (name = "updated_at") =>
  text(name)
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);
const active = () =>
  integer("is_active", { mode: "boolean" }).notNull().default(true);

export const genders = sqliteTable("Gender", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isActive: active(),
});

export const users = sqliteTable(
  "User",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    oidcSubject: text("oidc_subject").unique(),
    email: text("email").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: text("date_of_birth"),
    genderId: integer("gender_id").references(() => genders.id, {
      onDelete: "set null",
    }),
    isActive: active(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("user_name_idx").on(t.lastName, t.firstName)],
);

export const roles = sqliteTable("Role", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: active(),
});

export const userRoles = sqliteTable(
  "User_Role",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("user_role_user_role_uq").on(t.userId, t.roleId)],
);

export const crewMembers = sqliteTable("Crew_Member", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  badgeNumber: text("badge_number").notNull().unique(),
  isActive: active(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const airlines = sqliteTable(
  "Airline",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    iataCode: text("iata_code").notNull().unique(),
    icaoCode: text("icao_code").notNull().unique(),
    name: text("name").notNull(),
    isActive: active(),
  },
  (t) => [
    check("airline_iata_length_ck", sql`length(${t.iataCode}) = 2`),
    check("airline_icao_length_ck", sql`length(${t.icaoCode}) = 3`),
  ],
);

export const airports = sqliteTable(
  "Airport",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    iataCode: text("iata_code").notNull().unique(),
    icaoCode: text("icao_code").notNull().unique(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    timeZone: text("time_zone").notNull(),
    isActive: active(),
  },
  (t) => [
    check("airport_iata_length_ck", sql`length(${t.iataCode}) = 3`),
    check("airport_icao_length_ck", sql`length(${t.icaoCode}) = 4`),
  ],
);

export const flights = sqliteTable(
  "Flight",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    airlineId: integer("airline_id")
      .notNull()
      .references(() => airlines.id, { onDelete: "restrict" }),
    flightNumber: text("flight_number").notNull(),
    originAirportId: integer("origin_airport_id")
      .notNull()
      .references(() => airports.id, { onDelete: "restrict" }),
    destinationAirportId: integer("destination_airport_id")
      .notNull()
      .references(() => airports.id, { onDelete: "restrict" }),
    scheduledDeparture: text("scheduled_departure").notNull(),
    scheduledArrival: text("scheduled_arrival").notNull(),
    actualDeparture: text("actual_departure"),
    actualArrival: text("actual_arrival"),
    isActive: active(),
  },
  (t) => [
    index("flight_departure_idx").on(t.scheduledDeparture),
    index("flight_number_idx").on(t.airlineId, t.flightNumber),
  ],
);

export const crewDesignations = sqliteTable("Crew_Designation", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isActive: active(),
});

export const flightCrew = sqliteTable(
  "Flight_Crew",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    flightId: text("flight_id")
      .notNull()
      .references(() => flights.id, { onDelete: "cascade" }),
    crewMemberId: text("crew_member_id")
      .notNull()
      .references(() => crewMembers.id, { onDelete: "restrict" }),
    designationId: integer("designation_id")
      .notNull()
      .references(() => crewDesignations.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("flight_crew_flight_member_uq").on(t.flightId, t.crewMemberId),
    uniqueIndex("flight_crew_id_assignment_uq").on(
      t.id,
      t.flightId,
      t.crewMemberId,
    ),
  ],
);

export const currencies = sqliteTable(
  "Currency",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    minorUnits: integer("minor_units").notNull().default(2),
    isActive: active(),
  },
  (t) => [
    check("currency_minor_units_ck", sql`${t.minorUnits} BETWEEN 0 AND 4`),
  ],
);

export const expenseCategories = sqliteTable("Expense_Category", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isActive: active(),
});

export const expenses = sqliteTable(
  "Expense",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    flightCrewId: text("flight_crew_id")
      .notNull()
      .references(() => flightCrew.id, { onDelete: "restrict" }),
    amount: text("amount").notNull(),
    originalCurrencyId: integer("original_currency_id")
      .notNull()
      .references(() => currencies.id, { onDelete: "restrict" }),
    expenseDate: text("expense_date").notNull(),
    location: text("location"),
    categoryId: integer("category_id")
      .notNull()
      .references(() => expenseCategories.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("expense_assignment_date_idx").on(t.flightCrewId, t.expenseDate),
    check("expense_amount_decimal_ck", sql`CAST(${t.amount} AS REAL) >= 0`),
  ],
);

export const expenseDocuments = sqliteTable(
  "Expense_Document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    documentType: text("document_type").notNull(),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    uploadedAt: createdAt("uploaded_at"),
  },
  (t) => [
    index("expense_document_expense_idx").on(t.expenseId),
    check("expense_document_size_ck", sql`${t.fileSizeBytes} >= 0`),
  ],
);

export const claims = sqliteTable(
  "Claim",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    flightCrewId: text("flight_crew_id")
      .notNull()
      .unique()
      .references(() => flightCrew.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("DRAFT"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("claim_status_idx").on(t.status),
    uniqueIndex("claim_id_assignment_uq").on(t.id, t.flightCrewId),
  ],
);

export const claimExpenses = sqliteTable(
  "Claim_Expense",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    expenseId: text("expense_id")
      .notNull()
      .unique()
      .references(() => expenses.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("claim_expense_claim_expense_uq").on(t.claimId, t.expenseId),
  ],
);

export const claimComments = sqliteTable(
  "Claim_Comment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    comment: text("comment").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("claim_comment_claim_idx").on(t.claimId)],
);

export const deploymentSetup = sqliteTable(
  "Deployment_Setup",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    setupCompletedAt: text("setup_completed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check("deployment_setup_single_row_ck", sql`${t.id} = 1`)],
);

export const systemSettings = sqliteTable(
  "System_Setting",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    defaultCurrencyId: integer("default_currency_id")
      .notNull()
      .references(() => currencies.id, { onDelete: "restrict" }),
    maxUploadSizeBytes: integer("max_upload_size_bytes")
      .notNull()
      .default(10485760),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("system_setting_single_row_ck", sql`${t.id} = 1`),
    check("system_setting_upload_size_ck", sql`${t.maxUploadSizeBytes} > 0`),
  ],
);

export const allowedFileTypes = sqliteTable(
  "Allowed_File_Type",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    systemSettingId: integer("system_setting_id")
      .notNull()
      .references(() => systemSettings.id, { onDelete: "cascade" }),
    fileType: text("file_type").notNull(),
  },
  (t) => [
    uniqueIndex("allowed_file_type_setting_type_uq").on(
      t.systemSettingId,
      t.fileType,
    ),
  ],
);

export const notifications = sqliteTable(
  "Notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    createdAt: createdAt(),
    readAt: text("read_at"),
  },
  (t) => [index("notification_user_unread_idx").on(t.userId, t.readAt)],
);

export const auditOutbox = sqliteTable(
  "Audit_Outbox",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    eventType: text("event_type").notNull(),
    payloadJson: text("payload_json").notNull(),
    correlationId: text("correlation_id"),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    processedAt: text("processed_at"),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextAttemptAt: text("next_attempt_at"),
    lastError: text("last_error"),
  },
  (t) => [
    index("audit_outbox_pending_idx").on(t.processedAt, t.nextAttemptAt),
    index("audit_outbox_entity_idx").on(t.entityType, t.entityId),
  ],
);

export const schema = {
  genders,
  users,
  roles,
  userRoles,
  crewMembers,
  airlines,
  flights,
  airports,
  crewDesignations,
  flightCrew,
  currencies,
  expenseCategories,
  expenses,
  expenseDocuments,
  claims,
  claimComments,
  claimExpenses,
  deploymentSetup,
  systemSettings,
  allowedFileTypes,
  notifications,
  auditOutbox,
};

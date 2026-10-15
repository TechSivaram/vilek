import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./client";
import {
  genders, users, roles, userRoles, crewMembers, airlines, airports, flights,
  crewDesignations, flightCrew, currencies, expenseCategories, expenses,
  expenseDocuments, claims, claimComments, claimExpenses, deploymentSetup,
  systemSettings, allowedFileTypes, notifications, auditOutbox,
} from "./schema";

/**
 * ViLek demo seed data. TSCloak demo identities are provisioned through SCIM first;
 * local role assignments and all application data remain in ViLek's own database.
 * Safe to re-run: SCIM users are matched by email and local reference rows ignore conflicts.
 * All names/emails are fictional; no real receipts or personal data are used.
 */
const DEMO_EMAIL = "ananya.sharma.demo@vilek.test";

const people = [
  { email: DEMO_EMAIL, firstName: "Ananya", lastName: "Sharma", gender: "FEMALE", badge: "VL-DEMO-101", designation: "SENIOR_CABIN_CREW", role: "CREW" },
  { email: "rohan.mehta.demo@vilek.test", firstName: "Rohan", lastName: "Mehta", gender: "MALE", badge: "VL-DEMO-102", designation: "CAPTAIN", role: "CREW" },
  { email: "priya.nair.demo@vilek.test", firstName: "Priya", lastName: "Nair", gender: "FEMALE", badge: "VL-DEMO-103", designation: "FIRST_OFFICER", role: "CREW" },
  { email: "kabir.khan.demo@vilek.test", firstName: "Kabir", lastName: "Khan", gender: "MALE", badge: "VL-DEMO-104", designation: "FLIGHT_ATTENDANT", role: "CREW" },
  { email: "meera.iyer.demo@vilek.test", firstName: "Meera", lastName: "Iyer", gender: "FEMALE", badge: "VL-DEMO-105", designation: "SENIOR_CABIN_CREW", role: "CREW" },
  { email: "dev.menon.approver@vilek.test", firstName: "Dev", lastName: "Menon", gender: "MALE", badge: "VL-DEMO-900", designation: "CAPTAIN", role: "APPROVER" },
] as const;

type ScimUser = {
  id: string;
  userName?: string;
  active?: boolean;
  displayName?: string;
  name?: { givenName?: string; familyName?: string };
  emails?: Array<{ value?: string; primary?: boolean }>;
};
type ScimListResponse = { Resources?: ScimUser[]; totalResults?: number };
type TokenResponse = { access_token?: string; token_type?: string; expires_in?: number; scope?: string; error?: string; error_description?: string };

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}.`);
  return value;
}

async function fetchScimToken(): Promise<string> {
  const issuer = (process.env.TSCLOAK_ISSUER ?? "https://tscloak.onrender.com").replace(/\/$/, "");
  const clientId = requiredEnv("TSCLOAK_SCIM_CLIENT_ID");
  const clientSecret = requiredEnv("TSCLOAK_SCIM_CLIENT_SECRET");
  const authMethod = (process.env.TSCLOAK_SCIM_TOKEN_AUTH_METHOD ?? "client_secret_post").toLowerCase();
  const form = new URLSearchParams({ grant_type: "client_credentials", scope: "scim" });
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded", accept: "application/json" };
  if (authMethod === "client_secret_basic") {
    headers.authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    form.set("client_id", clientId);
  } else if (authMethod === "client_secret_post") {
    form.set("client_id", clientId);
    form.set("client_secret", clientSecret);
  } else {
    throw new Error("TSCLOAK_SCIM_TOKEN_AUTH_METHOD must be client_secret_post or client_secret_basic.");
  }

  const response = await fetch(`${issuer}/token`, { method: "POST", headers, body: form, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as TokenResponse;
  if (!response.ok || !body.access_token) {
    throw new Error(`TSCloak SCIM token request failed (HTTP ${response.status}): ${body.error_description ?? body.error ?? "no access_token returned"}`);
  }
  if (body.scope && !body.scope.split(/\s+/).includes("scim")) {
    throw new Error("TSCloak returned a token without the required scim scope.");
  }
  return body.access_token;
}

function scimEmail(user: ScimUser): string | undefined {
  return user.emails?.find((entry) => entry.primary && entry.value)?.value?.toLowerCase()
    ?? user.emails?.find((entry) => entry.value)?.value?.toLowerCase();
}

async function listScimUsers(issuer: string, token: string): Promise<ScimUser[]> {
  const response = await fetch(`${issuer}/scim/v2/Users`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/scim+json, application/json" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as ScimListResponse & { detail?: string; message?: string };
  if (!response.ok || !Array.isArray(body.Resources)) {
    throw new Error(`TSCloak SCIM user-list request failed (HTTP ${response.status}): ${body.detail ?? body.message ?? "expected SCIM ListResponse.Resources"}`);
  }
  return body.Resources;
}

async function provisionDemoUsersThroughScim(): Promise<Map<string, string>> {
  if (process.env.TSCLOAK_SCIM_ENABLED !== "true") {
    throw new Error("SCIM provisioning is disabled. Set TSCLOAK_SCIM_ENABLED=true to intentionally provision demo users in hosted TSCloak.");
  }
  const issuer = (process.env.TSCLOAK_ISSUER ?? "https://tscloak.onrender.com").replace(/\/$/, "");
  const scimClientId = requiredEnv("TSCLOAK_SCIM_CLIENT_ID");
  const oidcClientId = requiredEnv("TSCLOAK_CLIENT_ID");
  // TSCloak provisions users into the client context represented by the SCIM token.
  // Keep SCIM and interactive login on the same client so these users belong to ViLek.
  if (oidcClientId !== scimClientId) {
    throw new Error("TSCLOAK_SCIM_CLIENT_ID must match TSCLOAK_CLIENT_ID: TSCloak scopes SCIM-provisioned users to the client used to obtain the token.");
  }

  const token = await fetchScimToken();
  let existing = await listScimUsers(issuer, token);
  const ids = new Map<string, string>();
  for (const person of people) {
    let match = existing.find((user) => scimEmail(user) === person.email.toLowerCase());
    if (!match) {
      const username = person.email;
      const response = await fetch(`${issuer}/scim/v2/Users`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/scim+json, application/json",
          "content-type": "application/scim+json",
        },
        // Matches TSCloak's documented ScimUserDto exactly. This endpoint
        // rejects `schemas`; its DTO has no password field, so credentials
        // must be set separately through TSCloak's supported credential flow.
        body: JSON.stringify({
          userName: username,
          name: { givenName: person.firstName, familyName: person.lastName },
          displayName: `${person.firstName} ${person.lastName}`,
          emails: [{ value: person.email, type: "work", primary: true }],
          active: true,
        }),
        cache: "no-store",
      });
      const created = await response.json().catch(() => ({})) as ScimUser & { detail?: string; message?: string; error?: string };
      if (response.status === 409) {
        // Idempotency fallback if a userName already exists but wasn't present in the initial list.
        existing = await listScimUsers(issuer, token);
        match = existing.find((user) => scimEmail(user) === person.email.toLowerCase() || user.userName?.toLowerCase() === username.toLowerCase());
        if (!match) throw new Error(`TSCloak reports a username conflict for ${person.email}, but the user could not be found in the SCIM list.`);
      } else if (!response.ok || !created.id) {
        throw new Error(`TSCloak SCIM create failed for ${person.email} (HTTP ${response.status}): ${created.detail ?? created.message ?? created.error ?? "no SCIM user id returned"}`);
      } else {
        match = created;
        existing.push(created);
        console.log(`SCIM provisioned demo identity: ${person.email}`);
      }
    }
    if (!match?.id) throw new Error(`TSCloak SCIM response for ${person.email} did not include an id.`);
    if (match.active === false) {
      throw new Error(`The existing TSCloak identity ${person.email} is inactive; refusing to silently reactivate it during seeding.`);
    }
    ids.set(person.email.toLowerCase(), match.id);
  }
  console.log(`TSCloak SCIM ready: ${ids.size} demo identities found or provisioned.`);
  return ids;
}

async function main() {
  const scimIds = await provisionDemoUsersThroughScim();
  db.transaction((tx) => {
  // Always upsert role definitions before the demo-data guard. This lets an
  // existing database receive newly introduced roles when the seed is rerun.
  tx.insert(roles).values([
    { code: "ADMIN", name: "Administrator", description: "Manages users and configuration" },
    { code: "CREW", name: "Crew Member", description: "Creates and tracks expense claims" },
    { code: "APPROVER", name: "Claim Approver", description: "Reviews and approves claims" },
    { code: "FINANCE", name: "Finance", description: "Processes approved reimbursements" },
    { code: "FLIGHT_OPERATIONS_MANAGER", name: "Flight Operations Manager", description: "Manages flight schedules, flight records, and crew assignments; does not grant claim approval or system administration permissions." },
  ]).onConflictDoNothing().run();

  // TSCloak's SCIM resource id is used as the OIDC subject for this deployment.
  // Update only synthetic/pending demo mappings; never overwrite a real identity link.
  for (const person of people) {
    const local = tx.select({ id: users.id, oidcSubject: users.oidcSubject }).from(users).where(eq(users.email, person.email)).get();
    const scimId = scimIds.get(person.email.toLowerCase());
    if (local && scimId && (local.oidcSubject.startsWith("demo|") || local.oidcSubject.startsWith("scim-pending:"))) {
      const conflict = tx.select({ id: users.id }).from(users).where(eq(users.oidcSubject, scimId)).get();
      if (conflict && conflict.id !== local.id) {
        throw new Error(`SCIM subject ${scimId} is already linked to a different ViLek user; refusing to relink ${person.email}.`);
      }
      tx.update(users).set({ oidcSubject: scimId, updatedAt: new Date().toISOString() }).where(eq(users.id, local.id)).run();
    }
  }
  const existingDemo = tx.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL)).get();
  if (existingDemo) {
    console.log("ViLek demo data already exists; role definitions and SCIM identity links were refreshed.");
    return;
  }

  // Reference/master data. Unique-code conflicts are intentionally ignored.
  tx.insert(genders).values([
    { code: "UNSPECIFIED", name: "Unspecified" },
    { code: "FEMALE", name: "Female" },
    { code: "MALE", name: "Male" },
    { code: "NON_BINARY", name: "Non-binary" },
  ]).onConflictDoNothing().run();
  tx.insert(currencies).values([
    { code: "INR", name: "Indian Rupee", minorUnits: 2 },
    { code: "USD", name: "US Dollar", minorUnits: 2 },
    { code: "AED", name: "UAE Dirham", minorUnits: 2 },
    { code: "EUR", name: "Euro", minorUnits: 2 },
    { code: "GBP", name: "Pound Sterling", minorUnits: 2 },
  ]).onConflictDoNothing().run();
  tx.insert(expenseCategories).values([
    { code: "ACCOMMODATION", name: "Accommodation" },
    { code: "MEALS", name: "Meals" },
    { code: "TRANSPORT", name: "Ground Transport" },
    { code: "COMMUNICATION", name: "Communication" },
    { code: "BAGGAGE", name: "Baggage" },
    { code: "PARKING", name: "Parking" },
    { code: "UNIFORM", name: "Uniform and Laundry" },
    { code: "OTHER", name: "Other" },
  ]).onConflictDoNothing().run();
  tx.insert(crewDesignations).values([
    { code: "CAPTAIN", name: "Captain" },
    { code: "FIRST_OFFICER", name: "First Officer" },
    { code: "SENIOR_CABIN_CREW", name: "Senior Cabin Crew" },
    { code: "FLIGHT_ATTENDANT", name: "Flight Attendant" },
  ]).onConflictDoNothing().run();
  tx.insert(airlines).values([
    { iataCode: "AI", icaoCode: "AIC", name: "Air India" },
    { iataCode: "6E", icaoCode: "IGO", name: "IndiGo" },
  ]).onConflictDoNothing().run();
  tx.insert(airports).values([
    { iataCode: "HYD", icaoCode: "VOHS", name: "Rajiv Gandhi International Airport", city: "Hyderabad", country: "India", timeZone: "Asia/Kolkata" },
    { iataCode: "DEL", icaoCode: "VIDP", name: "Indira Gandhi International Airport", city: "Delhi", country: "India", timeZone: "Asia/Kolkata" },
    { iataCode: "BOM", icaoCode: "VABB", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", country: "India", timeZone: "Asia/Kolkata" },
    { iataCode: "BLR", icaoCode: "VOBL", name: "Kempegowda International Airport", city: "Bengaluru", country: "India", timeZone: "Asia/Kolkata" },
    { iataCode: "DXB", icaoCode: "OMDB", name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates", timeZone: "Asia/Dubai" },
    { iataCode: "COK", icaoCode: "VOCI", name: "Cochin International Airport", city: "Kochi", country: "India", timeZone: "Asia/Kolkata" },
  ]).onConflictDoNothing().run();

  const gender = (code: string) => tx.select().from(genders).where(eq(genders.code, code)).get()!;
  const role = (code: string) => tx.select().from(roles).where(eq(roles.code, code)).get()!;
  const currency = (code: string) => tx.select().from(currencies).where(eq(currencies.code, code)).get()!;
  const category = (code: string) => tx.select().from(expenseCategories).where(eq(expenseCategories.code, code)).get()!;
  const designation = (code: string) => tx.select().from(crewDesignations).where(eq(crewDesignations.code, code)).get()!;
  const airline = (code: string) => tx.select().from(airlines).where(eq(airlines.iataCode, code)).get()!;
  const airport = (code: string) => tx.select().from(airports).where(eq(airports.iataCode, code)).get()!;

  const personRows = people.map((p, i) => {
    const [u] = tx.insert(users).values({
      oidcSubject: scimIds.get(p.email.toLowerCase())!, email: p.email, firstName: p.firstName, lastName: p.lastName,
      genderId: gender(p.gender).id,
    }).returning().all();
    tx.insert(userRoles).values({ userId: u.id, roleId: role(p.role).id }).onConflictDoNothing().run();
    if (p.role === "APPROVER") tx.insert(userRoles).values({ userId: u.id, roleId: role("FINANCE").id }).onConflictDoNothing().run();
    const [cm] = tx.insert(crewMembers).values({ userId: u.id, badgeNumber: p.badge }).returning().all();
    return { ...p, user: u, crew: cm, index: i };
  });

  // Flights span domestic and international layovers, with realistic local-time offsets represented in ISO timestamps.
  const flightSpecs = [
    { airline: "AI", number: "AI 543", from: "HYD", to: "DEL", dep: "2026-10-08T01:00:00.000Z", arr: "2026-10-08T03:20:00.000Z" },
    { airline: "6E", number: "6E 6214", from: "DEL", to: "BOM", dep: "2026-10-09T04:30:00.000Z", arr: "2026-10-09T06:45:00.000Z" },
    { airline: "AI", number: "AI 951", from: "BOM", to: "DXB", dep: "2026-10-10T16:00:00.000Z", arr: "2026-10-10T19:10:00.000Z" },
    { airline: "AI", number: "AI 934", from: "DXB", to: "COK", dep: "2026-10-12T03:00:00.000Z", arr: "2026-10-12T06:50:00.000Z" },
    { airline: "6E", number: "6E 507", from: "BLR", to: "HYD", dep: "2026-10-13T02:15:00.000Z", arr: "2026-10-13T03:30:00.000Z" },
    { airline: "AI", number: "AI 512", from: "DEL", to: "BLR", dep: "2026-10-14T07:10:00.000Z", arr: "2026-10-14T09:55:00.000Z" },
  ];
  const flightRows = flightSpecs.map((f) => tx.insert(flights).values({
    airlineId: airline(f.airline).id, flightNumber: f.number,
    originAirportId: airport(f.from).id, destinationAirportId: airport(f.to).id,
    scheduledDeparture: f.dep, scheduledArrival: f.arr,
    actualDeparture: f.dep, actualArrival: f.arr,
  }).returning().get());

  const assignments: Array<{ id: string; personIndex: number; flightIndex: number }> = [];
  const assignmentPlan = [
    [0, 0, "SENIOR_CABIN_CREW"], [1, 0, "CAPTAIN"], [2, 0, "FIRST_OFFICER"], [3, 0, "FLIGHT_ATTENDANT"],
    [0, 1, "SENIOR_CABIN_CREW"], [3, 1, "FLIGHT_ATTENDANT"], [4, 1, "SENIOR_CABIN_CREW"],
    [1, 2, "CAPTAIN"], [2, 2, "FIRST_OFFICER"], [4, 2, "SENIOR_CABIN_CREW"],
    [0, 3, "SENIOR_CABIN_CREW"], [3, 3, "FLIGHT_ATTENDANT"], [4, 3, "SENIOR_CABIN_CREW"],
    [1, 4, "CAPTAIN"], [2, 4, "FIRST_OFFICER"], [3, 4, "FLIGHT_ATTENDANT"],
    [0, 5, "SENIOR_CABIN_CREW"], [1, 5, "CAPTAIN"], [2, 5, "FIRST_OFFICER"],
  ] as const;
  assignmentPlan.forEach(([personIndex, flightIndex, designationCode]) => {
    const [a] = tx.insert(flightCrew).values({
      flightId: flightRows[flightIndex].id,
      crewMemberId: personRows[personIndex].crew.id,
      designationId: designation(designationCode).id,
    }).returning().all();
    assignments.push({ id: a.id, personIndex, flightIndex });
  });

  const expenseSpecs = [
    { a: 0, amount: "2450.00", cur: "INR", date: "2026-10-08", loc: "New Delhi", cat: "ACCOMMODATION", desc: "Airport hotel room during extended layover", status: "SUBMITTED" },
    { a: 0, amount: "680.00", cur: "INR", date: "2026-10-08", loc: "New Delhi", cat: "MEALS", desc: "Dinner during layover", status: "SUBMITTED" },
    { a: 1, amount: "920.00", cur: "INR", date: "2026-10-08", loc: "New Delhi", cat: "TRANSPORT", desc: "Airport to crew hotel taxi", status: "APPROVED" },
    { a: 2, amount: "32.50", cur: "USD", date: "2026-10-10", loc: "Dubai", cat: "MEALS", desc: "Crew meal while on international duty", status: "APPROVED" },
    { a: 2, amount: "145.00", cur: "AED", date: "2026-10-10", loc: "Dubai", cat: "TRANSPORT", desc: "Taxi from airport to designated hotel", status: "APPROVED" },
    { a: 3, amount: "1850.00", cur: "INR", date: "2026-10-09", loc: "Mumbai", cat: "ACCOMMODATION", desc: "Approved overnight stay", status: "PAID" },
    { a: 4, amount: "410.00", cur: "INR", date: "2026-10-09", loc: "Mumbai", cat: "MEALS", desc: "Breakfast and dinner during roster disruption", status: "PAID" },
    { a: 5, amount: "760.00", cur: "INR", date: "2026-10-09", loc: "Mumbai", cat: "TRANSPORT", desc: "Pre-booked crew transfer", status: "PAID" },
    { a: 7, amount: "48.00", cur: "AED", date: "2026-10-10", loc: "Dubai", cat: "COMMUNICATION", desc: "Local SIM and data for duty coordination", status: "SUBMITTED" },
    { a: 8, amount: "220.00", cur: "AED", date: "2026-10-10", loc: "Dubai", cat: "MEALS", desc: "Meal allowance top-up with receipt", status: "SUBMITTED" },
    { a: 10, amount: "1250.00", cur: "INR", date: "2026-10-12", loc: "Kochi", cat: "UNIFORM", desc: "Uniform laundry after multi-sector duty", status: "DRAFT" },
    { a: 11, amount: "390.00", cur: "INR", date: "2026-10-12", loc: "Kochi", cat: "MEALS", desc: "Meal during return layover", status: "DRAFT" },
    { a: 13, amount: "550.00", cur: "INR", date: "2026-10-13", loc: "Hyderabad", cat: "TRANSPORT", desc: "Late-night airport transfer", status: "SUBMITTED" },
    { a: 16, amount: "1750.00", cur: "INR", date: "2026-10-14", loc: "Bengaluru", cat: "ACCOMMODATION", desc: "Hotel stay due to roster change", status: "REJECTED" },
    { a: 17, amount: "540.00", cur: "INR", date: "2026-10-14", loc: "Bengaluru", cat: "MEALS", desc: "Dinner during overnight stop", status: "SUBMITTED" },
    { a: 18, amount: "125.00", cur: "INR", date: "2026-10-14", loc: "Delhi", cat: "PARKING", desc: "Crew parking for approved repositioning", status: "DRAFT" },
  ] as const;
  const claimByAssignment = new Map<string, string>();
  const expenseRows = expenseSpecs.map((e, i) => {
    const assignment = assignments[e.a];
    const [expense] = tx.insert(expenses).values({
      flightCrewId: assignment.id, amount: e.amount, originalCurrencyId: currency(e.cur).id,
      expenseDate: e.date, location: e.loc, categoryId: category(e.cat).id, description: e.desc,
    }).returning().all();
    let claimId = claimByAssignment.get(assignment.id);
    if (!claimId) {
      const [claim] = tx.insert(claims).values({ flightCrewId: assignment.id, status: e.status }).returning().all();
      claimId = claim.id;
      claimByAssignment.set(assignment.id, claimId);
    }
    tx.insert(claimExpenses).values({ claimId, expenseId: expense.id }).run();
    if (i % 3 !== 1) {
      tx.insert(expenseDocuments).values({
        expenseId: expense.id, documentType: "RECEIPT",
        storageKey: `demo/receipts/${e.date}/${String(i + 1).padStart(3, "0")}-receipt.pdf`,
        fileName: `receipt-${String(i + 1).padStart(3, "0")}.pdf`, contentType: "application/pdf",
        fileSizeBytes: 48200 + (i * 1731),
      }).run();
    }
    return { expense, claimId, assignment, spec: e };
  });

  const approver = personRows[5].user;
  const crewUser = (personIndex: number) => personRows[personIndex].user;
  expenseRows.forEach((row, i) => {
    if (["SUBMITTED", "APPROVED", "PAID", "REJECTED"].includes(row.spec.status)) {
      const comment = row.spec.status === "REJECTED"
        ? "Please attach an itemised hotel invoice and clarify why this stay was required."
        : row.spec.status === "PAID"
          ? "Verified against the receipt and included in the latest reimbursement batch."
          : row.spec.status === "APPROVED"
            ? "Receipt and amount checked; approved under the crew expense policy."
            : "Submitted for review. Receipt is attached where available.";
      tx.insert(claimComments).values({ claimId: row.claimId, userId: row.spec.status === "SUBMITTED" ? crewUser(assignments[row.spec.a].personIndex).id : approver.id, comment }).run();
      tx.insert(notifications).values({
        userId: crewUser(assignments[row.spec.a].personIndex).id,
        type: row.spec.status === "REJECTED" ? "CLAIM_REJECTED" : row.spec.status === "APPROVED" ? "CLAIM_APPROVED" : row.spec.status === "PAID" ? "REIMBURSEMENT_PAID" : "CLAIM_SUBMITTED",
        title: row.spec.status === "REJECTED" ? "Claim needs more information" : row.spec.status === "APPROVED" ? "Claim approved" : row.spec.status === "PAID" ? "Reimbursement processed" : "Claim submitted",
        message: row.spec.status === "REJECTED" ? "Please review the approver comment and upload the requested invoice." : row.spec.status === "APPROVED" ? "Your expense claim has been approved." : row.spec.status === "PAID" ? "Your reimbursement has been marked as paid." : "Your claim is waiting for review.",
        targetType: "Claim", targetId: row.claimId,
        readAt: i % 2 === 0 ? null : "2026-10-15T02:00:00.000Z",
      }).run();
    }
  });

  // Single-row deployment/configuration tables.
  tx.insert(deploymentSetup).values({ id: 1, setupCompletedAt: "2026-10-01T09:00:00.000Z" }).onConflictDoNothing().run();
  tx.insert(systemSettings).values({ id: 1, defaultCurrencyId: currency("INR").id, maxUploadSizeBytes: 10485760 }).onConflictDoNothing().run();
  const setting = tx.select().from(systemSettings).where(eq(systemSettings.id, 1)).get();
  if (setting) tx.insert(allowedFileTypes).values([
    { systemSettingId: setting.id, fileType: "image/jpeg" },
    { systemSettingId: setting.id, fileType: "image/png" },
    { systemSettingId: setting.id, fileType: "application/pdf" },
  ]).onConflictDoNothing().run();

  // Example outbox events for the audit/event processing screen.
  expenseRows.slice(0, 5).forEach((row, i) => tx.insert(auditOutbox).values({
    entityType: "Claim", entityId: row.claimId,
    eventType: i < 2 ? "ClaimSubmitted" : "ClaimStatusChanged",
    payloadJson: JSON.stringify({ claimId: row.claimId, status: row.spec.status, source: "demo-seed" }),
    correlationId: `demo-correlation-${String(i + 1).padStart(3, "0")}`,
    actorUserId: i < 2 ? crewUser(assignments[row.spec.a].personIndex).id : approver.id,
    processedAt: i < 3 ? "2026-10-15T02:10:00.000Z" : null,
    attemptCount: i < 3 ? 1 : 0,
  }));
  });
  console.log("ViLek realistic demo data seeded successfully.");
  console.log("TSCloak SCIM identities were provisioned/matched and their SCIM IDs were mapped to ViLek oidcSubject.");
  console.log("Demo emails use the reserved .test domain; these are fictional local-development records.");
  console.log("SCIM creates identity records, not guaranteed login passwords. Set credentials through TSCloak's supported admin/credential workflow.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown seed failure";
  console.error(`ViLek seed failed: ${message}`);
  process.exitCode = 1;
});

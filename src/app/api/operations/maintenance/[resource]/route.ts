import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { getMaintenanceDb, maintenanceResourceConfig } from "@/lib/operations/maintenance";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ resource: string }> };
function getResource(name: string) { return maintenanceResourceConfig(name); }

export const GET = withRouteGuard({ roles: ["FLIGHT_OPERATIONS_MANAGER"] }, async (_request: Request, context: Ctx) => {
  const { resource: name } = await context.params; const resource = getResource(name);
  if (!resource) return NextResponse.json({ error: "Unknown maintenance resource." }, { status: 404 });
  const sqlite = getMaintenanceDb();
  try { const rows = sqlite.prepare(`SELECT * FROM "${resource.table}" ORDER BY "${resource.id}" DESC LIMIT 500`).all(); return NextResponse.json({ resource: name, label: resource.label, writable: resource.writable, columns: resource.columns, rows }); }
  catch { return NextResponse.json({ error: "Could not load this resource. Confirm migrations have been applied." }, { status: 500 }); }
  finally { sqlite.close(); }
});

export const POST = withRouteGuard({ roles: ["FLIGHT_OPERATIONS_MANAGER"] }, async (request: Request, context: Ctx) => {
  const { resource: name } = await context.params; const resource = getResource(name);
  if (!resource) return NextResponse.json({ error: "Unknown maintenance resource." }, { status: 404 });
  if (!resource.writable) return NextResponse.json({ error: "This history table is read-only." }, { status: 405 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
  const input = body as Record<string, unknown>; const keys = Object.keys(input);
  if (keys.some((key) => !(resource.columns as readonly string[]).includes(key))) return NextResponse.json({ error: "One or more fields are not editable for this resource." }, { status: 400 });
  if (resource.required.some((key) => input[key] === undefined || input[key] === null || input[key] === "")) return NextResponse.json({ error: `Required fields: ${resource.required.join(", ")}.` }, { status: 400 });
  if (name === "flight-operations-settings") { try { JSON.parse(String(input.value_json)); } catch { return NextResponse.json({ error: "value_json must contain valid JSON." }, { status: 400 }); } }
  const sqlite = getMaintenanceDb();
  try {
    const insertValues: Record<string, unknown> = { ...input };
    if ((resource.table === "Crew_Qualification" || resource.table === "Qualification_Alert") && !insertValues.id) insertValues.id = crypto.randomUUID();
    const insertKeys = Object.keys(insertValues); const cols = insertKeys.map((key) => `"${key}"`).join(", "); const marks = insertKeys.map(() => "?").join(", ");
    const values = insertKeys.map((key) => insertValues[key] === "" ? null : insertValues[key]);
    const result = sqlite.prepare(`INSERT INTO "${resource.table}" (${cols}) VALUES (${marks})`).run(...values as (string | number | bigint | null)[]);
    return NextResponse.json({ ok: true, id: result.lastInsertRowid.toString() }, { status: 201 });
  } catch (error) { const message = error instanceof Error && /UNIQUE|CHECK|FOREIGN KEY|NOT NULL/i.test(error.message) ? "The record conflicts with a unique, validation, or relationship constraint." : "The record could not be saved."; return NextResponse.json({ error: message }, { status: 409 }); }
  finally { sqlite.close(); }
});

export const PATCH = withRouteGuard({ roles: ["FLIGHT_OPERATIONS_MANAGER"] }, async (request: Request, context: Ctx) => {
  const { resource: name } = await context.params; const resource = getResource(name);
  if (!resource) return NextResponse.json({ error: "Unknown maintenance resource." }, { status: 404 });
  if (!resource.writable) return NextResponse.json({ error: "This history table is read-only." }, { status: 405 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Expected an object containing id and fields." }, { status: 400 });
  const input = body as Record<string, unknown>; const id = input.id; const values = { ...input }; delete values.id;
  if (id === undefined || id === null || id === "") return NextResponse.json({ error: "Record id is required." }, { status: 400 });
  const keys = Object.keys(values);
  if (!keys.length || keys.some((key) => !(resource.columns as readonly string[]).includes(key))) return NextResponse.json({ error: "Provide editable fields only." }, { status: 400 });
  if (resource.required.some((key) => values[key] === "" || values[key] === null)) return NextResponse.json({ error: `Required fields: ${resource.required.join(", ")}.` }, { status: 400 });
  if (name === "flight-operations-settings" && values.value_json !== undefined) { try { JSON.parse(String(values.value_json)); } catch { return NextResponse.json({ error: "value_json must contain valid JSON." }, { status: 400 }); } }
  const sqlite = getMaintenanceDb();
  try { const set = keys.map((key) => `"${key}" = ?`).join(", "); const params = keys.map((key) => values[key] === "" ? null : values[key]); const result = sqlite.prepare(`UPDATE "${resource.table}" SET ${set}${resource.table === "Crew_Member_Designation" || resource.table === "Qualification_Type" || resource.table === "Crew_Qualification" || resource.table === "Flight_Crew_Complement_Default" || resource.table === "Flight_Crew_Requirement" || resource.table === "Flight_Operations_Setting" ? ", updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')" : ""} WHERE "${resource.id}" = ?`).run(...params as (string | number | bigint | null)[], id as string | number); return result.changes ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Record not found." }, { status: 404 }); }
  catch { return NextResponse.json({ error: "The record could not be updated. Check constraints and linked records." }, { status: 409 }); }
  finally { sqlite.close(); }
});

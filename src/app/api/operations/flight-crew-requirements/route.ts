import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { getMaintenanceDb } from "@/lib/operations/maintenance";

export const dynamic = "force-dynamic";
const resourceConfig = { table: "Flight_Crew_Requirement", label: "Flight-specific crew requirements", id: "id", writable: true, required: ["flight_id", "designation_id", "required_count"], columns: ["flight_id", "designation_id", "required_count", "reason"] } as const;
type Ctx = { params: Promise<{ resource: string }> };


export const GET = withRouteGuard({ roles: ["FLIGHT_OPERATIONS_MANAGER"] }, async (request: Request, _context: Ctx) => {
  const name = "flight-crew-requirements"; const resource = resourceConfig;
  
  const sqlite = getMaintenanceDb();
  try {
    const query = new URL(request.url).searchParams;
    const flightId = query.get("flight_id");
    const search = (query.get("q") ?? "").trim();
    const isFlightList = query.get("view") === "flights" || (!flightId && query.has("q"));
    const flightProjection = `SELECT f.id AS flight_id, f.flight_number, f.scheduled_departure, f.scheduled_arrival, a.name AS airline_name, coalesce(dep.iata_code,'?') || ' → ' || coalesce(arr.iata_code,'?') AS flight_route, (SELECT COUNT(*) FROM Flight_Crew_Requirement r WHERE r.flight_id=f.id) AS requirement_count FROM Flight f LEFT JOIN Airline a ON a.id=f.airline_id LEFT JOIN Airport dep ON dep.id=f.origin_airport_id LEFT JOIN Airport arr ON arr.id=f.destination_airport_id`;
    if (isFlightList) {
      const where = search ? ` WHERE lower(coalesce(a.name,'') || ' ' || coalesce(f.flight_number,'') || ' ' || coalesce(dep.iata_code,'') || ' ' || coalesce(arr.iata_code,'')) LIKE ?` : "";
      const params = search ? [`%${search.toLocaleLowerCase()}%`] : [];
      const flights = sqlite.prepare(`${flightProjection}${where} ORDER BY a.name, f.flight_number LIMIT 500`).all(...params);
      return NextResponse.json({ resource: name, label: resource.label, writable: resource.writable, columns: resource.columns, displayColumns: ["airline_name","flight_number","flight_route","scheduled_departure","scheduled_arrival","flight_id"], rows: flights, options: { flight_id: sqlite.prepare(`SELECT f.id AS value, f.flight_number || ' — ' || coalesce(dep.iata_code,'?') || ' → ' || coalesce(arr.iata_code,'?') AS label FROM Flight f LEFT JOIN Airport dep ON dep.id=f.origin_airport_id LEFT JOIN Airport arr ON arr.id=f.destination_airport_id ORDER BY f.flight_number`).all(), designation_id: sqlite.prepare(`SELECT id AS value, name AS label FROM Crew_Designation ORDER BY name`).all() } });
    }
    const projections: Record<string, { sql: string; displayColumns: string[] }> = {
      "flight-crew-requirements": { sql: `SELECT r.id, r.flight_id, r.designation_id, r.required_count, r.reason, r.created_at, f.flight_number, f.scheduled_departure, f.scheduled_arrival, a.name AS airline_name, coalesce(dep.iata_code,'?') || ' → ' || coalesce(arr.iata_code,'?') AS flight_route, d.name AS designation_name FROM Flight_Crew_Requirement r LEFT JOIN Flight f ON f.id=r.flight_id LEFT JOIN Airline a ON a.id=f.airline_id LEFT JOIN Airport dep ON dep.id=f.origin_airport_id LEFT JOIN Airport arr ON arr.id=f.destination_airport_id LEFT JOIN Crew_Designation d ON d.id=r.designation_id WHERE (? IS NULL OR r.flight_id = ?) ORDER BY d.name LIMIT 500`, displayColumns: ["id","airline_name","flight_number","flight_route","scheduled_departure","scheduled_arrival","designation_name","required_count","reason","created_at"] }
    };
    const projection = projections[name];
    const rows = projection ? sqlite.prepare(projection.sql).all(flightId, flightId) : sqlite.prepare(`SELECT * FROM "${resource.table}" ORDER BY "${resource.id}" DESC LIMIT 500`).all();
    const options: Record<string, { value: string | number; label: string }[]> = {};
    const optionQueries: Record<string, string> = {
      flight_id: `SELECT f.id AS value, f.flight_number || ' — ' || coalesce(dep.iata_code,'?') || ' → ' || coalesce(arr.iata_code,'?') AS label FROM Flight f LEFT JOIN Airport dep ON dep.id=f.origin_airport_id LEFT JOIN Airport arr ON arr.id=f.destination_airport_id ORDER BY f.flight_number`,
      designation_id: `SELECT id AS value, name AS label FROM Crew_Designation ORDER BY name`,
    };
    for (const field of resource.columns) if (optionQueries[field]) options[field] = sqlite.prepare(optionQueries[field]).all() as { value: string | number; label: string }[];
    return NextResponse.json({ resource: name, label: resource.label, writable: resource.writable, columns: resource.columns, displayColumns: projection?.displayColumns, rows, options });
  }
  catch (error) { console.error("Operations maintenance query failed", error); return NextResponse.json({ error: "Could not load this resource. Confirm migrations have been applied and linked tables are available." }, { status: 500 }); }
  finally { sqlite.close(); }
});

export const POST = withRouteGuard({ roles: ["FLIGHT_OPERATIONS_MANAGER"] }, async (request: Request, _context: Ctx) => {
  const name = "flight-crew-requirements"; const resource = resourceConfig;
  
  if (!resource.writable) return NextResponse.json({ error: "This history table is read-only." }, { status: 405 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
  const input = body as Record<string, unknown>; const keys = Object.keys(input);
  if (keys.some((key) => !(resource.columns as readonly string[]).includes(key))) return NextResponse.json({ error: "One or more fields are not editable for this resource." }, { status: 400 });
  if (resource.required.some((key) => input[key] === undefined || input[key] === null || input[key] === "")) return NextResponse.json({ error: `Required fields: ${resource.required.join(", ")}.` }, { status: 400 });
  const sqlite = getMaintenanceDb();
  try {
    const insertValues: Record<string, unknown> = { ...input };
    
    const insertKeys = Object.keys(insertValues); const cols = insertKeys.map((key) => `"${key}"`).join(", "); const marks = insertKeys.map(() => "?").join(", ");
    const values = insertKeys.map((key) => insertValues[key] === "" ? null : insertValues[key]);
    const result = sqlite.prepare(`INSERT INTO "${resource.table}" (${cols}) VALUES (${marks})`).run(...values as (string | number | bigint | null)[]);
    return NextResponse.json({ ok: true, id: result.lastInsertRowid.toString() }, { status: 201 });
  } catch (error) { const message = error instanceof Error && /UNIQUE|CHECK|FOREIGN KEY|NOT NULL/i.test(error.message) ? "The record conflicts with a unique, validation, or relationship constraint." : "The record could not be saved."; return NextResponse.json({ error: message }, { status: 409 }); }
  finally { sqlite.close(); }
});

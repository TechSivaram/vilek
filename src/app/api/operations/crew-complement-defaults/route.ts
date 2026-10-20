import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { getMaintenanceDb } from "@/lib/operations/maintenance";

export const dynamic = "force-dynamic";
const resourceConfig = {
  table: "Flight_Crew_Complement_Default",
  label: "Default crew complement",
  id: "id",
  writable: true,
  required: ["designation_id", "required_count"],
  columns: ["designation_id", "required_count"],
} as const;

export const GET = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (_request: Request) => {
    const name = "crew-complement-defaults";
    const resource = resourceConfig;

    const sqlite = getMaintenanceDb();
    try {
      const projections: Record<
        string,
        { sql: string; displayColumns: string[] }
      > = {
        "crew-complement-defaults": {
          sql: `SELECT c.id, c.designation_id, c.required_count, c.updated_at, d.name AS designation_name FROM Flight_Crew_Complement_Default c LEFT JOIN Crew_Designation d ON d.id=c.designation_id ORDER BY d.name LIMIT 500`,
          displayColumns: [
            "id",
            "designation_name",
            "required_count",
            "updated_at",
          ],
        },
      };
      const projection = projections[name];
      const rows = projection
        ? sqlite.prepare(projection.sql).all()
        : sqlite
            .prepare(
              `SELECT * FROM "${resource.table}" ORDER BY "${resource.id}" DESC LIMIT 500`,
            )
            .all();
      const options: Record<
        string,
        { value: string | number; label: string }[]
      > = {};
      const optionQueries: Record<string, string> = {
        designation_id: `SELECT id AS value, name AS label FROM Crew_Designation ORDER BY name`,
      };
      for (const field of resource.columns)
        if (optionQueries[field])
          options[field] = sqlite.prepare(optionQueries[field]).all() as {
            value: string | number;
            label: string;
          }[];
      return NextResponse.json({
        resource: name,
        label: resource.label,
        writable: resource.writable,
        columns: resource.columns,
        displayColumns: projection?.displayColumns,
        rows,
        options,
      });
    } catch (error) {
      console.error("Operations maintenance query failed", error);
      return NextResponse.json(
        {
          error:
            "Could not load this resource. Confirm migrations have been applied and linked tables are available.",
        },
        { status: 500 },
      );
    } finally {
      sqlite.close();
    }
  },
);

export const POST = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request) => {
    const name = "crew-complement-defaults";
    const resource = resourceConfig;

    if (!resource.writable)
      return NextResponse.json(
        { error: "This history table is read-only." },
        { status: 405 },
      );
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return NextResponse.json(
        { error: "Expected a JSON object." },
        { status: 400 },
      );
    const input = body as Record<string, unknown>;
    const keys = Object.keys(input);
    if (
      keys.some((key) => !(resource.columns as readonly string[]).includes(key))
    )
      return NextResponse.json(
        { error: "One or more fields are not editable for this resource." },
        { status: 400 },
      );
    if (
      resource.required.some(
        (key) =>
          input[key] === undefined || input[key] === null || input[key] === "",
      )
    )
      return NextResponse.json(
        { error: `Required fields: ${resource.required.join(", ")}.` },
        { status: 400 },
      );
    const sqlite = getMaintenanceDb();
    try {
      const insertValues: Record<string, unknown> = { ...input };

      const insertKeys = Object.keys(insertValues);
      const cols = insertKeys.map((key) => `"${key}"`).join(", ");
      const marks = insertKeys.map(() => "?").join(", ");
      const values = insertKeys.map((key) =>
        insertValues[key] === "" ? null : insertValues[key],
      );
      const result = sqlite
        .prepare(`INSERT INTO "${resource.table}" (${cols}) VALUES (${marks})`)
        .run(...(values as (string | number | bigint | null)[]));
      return NextResponse.json(
        { ok: true, id: result.lastInsertRowid.toString() },
        { status: 201 },
      );
    } catch (error) {
      const message =
        error instanceof Error &&
        /UNIQUE|CHECK|FOREIGN KEY|NOT NULL/i.test(error.message)
          ? "The record conflicts with a unique, validation, or relationship constraint."
          : "The record could not be saved.";
      return NextResponse.json({ error: message }, { status: 409 });
    } finally {
      sqlite.close();
    }
  },
);

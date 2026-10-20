import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { getMaintenanceDb } from "@/lib/operations/maintenance";

export const dynamic = "force-dynamic";
const resourceConfig = {
  table: "Flight_Operations_Setting",
  label: "Flight Operations settings",
  id: "id",
  writable: true,
  required: ["setting_key", "value_json"],
  columns: ["setting_key", "value_json", "description"],
} as const;
type Ctx = { params: Promise<{ resource: string }> };

export const GET = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (_request: Request, _context: Ctx) => {
    const name = "flight-operations-settings";
    const resource = resourceConfig;

    const sqlite = getMaintenanceDb();
    try {
      const projections: Record<
        string,
        { sql: string; displayColumns: string[] }
      > = {
        "flight-operations-settings": {
          sql: `SELECT s.id, s.setting_key, s.value_json, s.description, s.updated_at, s.setting_key AS setting, s.description AS setting_description FROM Flight_Operations_Setting s ORDER BY s.setting_key LIMIT 500`,
          displayColumns: [
            "id",
            "setting",
            "value_json",
            "setting_description",
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
      const optionQueries: Record<string, string> = {};
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
  async (request: Request, _context: Ctx) => {
    const name = "flight-operations-settings";
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
    try {
      JSON.parse(String(input.value_json));
    } catch {
      return NextResponse.json(
        { error: "value_json must contain valid JSON." },
        { status: 400 },
      );
    }
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

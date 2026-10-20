import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { getMaintenanceDb } from "@/lib/operations/maintenance";

export const dynamic = "force-dynamic";
const resourceConfig = {
  table: "Audit_Retention_Policy",
  label: "Audit retention policy",
  id: "id",
  writable: true,
  required: ["id"],
  columns: ["id", "retention_days"],
} as const;

export const PATCH = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: routeId } = await context.params;
    const name = "audit-retention-policy";
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
        { error: "Expected an object containing id and fields." },
        { status: 400 },
      );
    const input = body as Record<string, unknown>;
    const id = routeId;
    const values = { ...input };
    delete values.id;
    if (id === undefined || id === null || id === "")
      return NextResponse.json(
        { error: "Record id is required." },
        { status: 400 },
      );
    const keys = Object.keys(values);
    if (
      !keys.length ||
      keys.some((key) => !(resource.columns as readonly string[]).includes(key))
    )
      return NextResponse.json(
        { error: "Provide editable fields only." },
        { status: 400 },
      );
    if (
      resource.required.some(
        (key) => values[key] === "" || values[key] === null,
      )
    )
      return NextResponse.json(
        { error: `Required fields: ${resource.required.join(", ")}.` },
        { status: 400 },
      );
    const sqlite = getMaintenanceDb();
    try {
      const set = keys.map((key) => `"${key}" = ?`).join(", ");
      const params = keys.map((key) =>
        values[key] === "" ? null : values[key],
      );
      const result = sqlite
        .prepare(
          `UPDATE "${resource.table}" SET ${set} WHERE "${resource.id}" = ?`,
        )
        .run(
          ...(params as (string | number | bigint | null)[]),
          id as string | number,
        );
      return result.changes
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ error: "Record not found." }, { status: 404 });
    } catch {
      return NextResponse.json(
        {
          error:
            "The record could not be updated. Check constraints and linked records.",
        },
        { status: 409 },
      );
    } finally {
      sqlite.close();
    }
  },
);

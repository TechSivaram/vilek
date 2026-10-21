import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { service as resourceService } from "@/lib/operations/features/qualification-types/service";
import {
  createInputSchema,
  updateInputSchema,
} from "@/lib/operations/features/qualification-types/schema";

export const dynamic = "force-dynamic";
const resourceConfig = {
  table: "Qualification_Type",
  label: "Qualification types",
  id: "id",
  writable: true,
  required: ["code", "name"],
  columns: ["code", "name", "expiry_required", "is_active"],
} as const;

export const GET = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (_request: Request) => {
    const name = "qualification-types";
    const resource = resourceConfig;
    try {
      const rows = resourceService.listRows();
      const options: Record<
        string,
        { value: string | number; label: string }[]
      > = {};
      for (const field of resource.columns) {
        const fieldOptions = resourceService.getOptions(field);
        if (fieldOptions.length) options[field] = fieldOptions;
      }
      return NextResponse.json({
        resource: name,
        label: resource.label,
        writable: resource.writable,
        columns: resource.columns,
        displayColumns: [
          "id",
          "code",
          "qualification_name",
          "expiry_policy",
          "status_label",
          "created_at",
          "updated_at",
        ],
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
    }
  },
);

export const POST = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request) => {
    const name = "qualification-types";
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
    const parsedInput = createInputSchema.safeParse(body);
    if (!parsedInput.success)
      return NextResponse.json(
        { error: "Invalid input.", details: parsedInput.error.flatten() },
        { status: 400 },
      );
    const input = parsedInput.data as Record<string, unknown>;
    try {
      const result = resourceService.create(input);
      return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
    } catch (error) {
      const message =
        error instanceof Error &&
        /UNIQUE|CHECK|FOREIGN KEY|NOT NULL/i.test(error.message)
          ? "The record conflicts with a unique, validation, or relationship constraint."
          : "The record could not be saved.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  },
);

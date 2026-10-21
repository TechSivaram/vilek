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

export const PATCH = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: routeId } = await context.params;
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
    const id = routeId;
    if (id === undefined || id === null || id === "")
      return NextResponse.json(
        { error: "Record id is required." },
        { status: 400 },
      );
    const parsedInput = updateInputSchema.safeParse(body);
    if (!parsedInput.success)
      return NextResponse.json(
        { error: "Invalid input.", details: parsedInput.error.flatten() },
        { status: 400 },
      );
    const values = parsedInput.data as Record<string, unknown>;
    try {
      const updated = resourceService.update(id, values);
      return updated
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
    }
  },
);

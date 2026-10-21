import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { createInputSchema } from "@/lib/operations/features/crew-complement-defaults/schema";
import { crewComplementDefaultsService } from "@/lib/operations/features/crew-complement-defaults/service";

export const dynamic = "force-dynamic";
const resource = {
  name: "crew-complement-defaults",
  label: "Default crew complement",
  writable: true,
  columns: ["designation_id", "required_count"],
  displayColumns: ["id", "designation_name", "required_count", "updated_at"],
} as const;

export const GET = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async () => {
    try {
      const { rows, options } = crewComplementDefaultsService.list();
      return NextResponse.json({
        resource: resource.name,
        label: resource.label,
        writable: resource.writable,
        columns: resource.columns,
        displayColumns: resource.displayColumns,
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
    try {
      const id = crewComplementDefaultsService.create(parsedInput.data);
      return NextResponse.json({ ok: true, id }, { status: 201 });
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

import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { designationQualificationRequirementsService } from "@/lib/operations/features/designation-qualification-requirements/service";
import { createInputSchema } from "@/lib/operations/features/designation-qualification-requirements/schema";

export const dynamic = "force-dynamic";
export const GET = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (_request: Request) => {
    const resource = designationQualificationRequirementsService.config;

    try {
      const result = designationQualificationRequirementsService.list();
      return NextResponse.json(result);
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
    const resource = designationQualificationRequirementsService.config;

    if (!resource.writable)
      return NextResponse.json({ error: "This history table is read-only." }, { status: 405 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsedInput = createInputSchema.safeParse(body);
    if (!parsedInput.success)
      return NextResponse.json(
        { error: "Invalid input.", details: parsedInput.error.flatten() },
        { status: 400 },
      );
    const input = parsedInput.data;
    try {
      const id = designationQualificationRequirementsService.create(input);
      return NextResponse.json({ ok: true, id }, { status: 201 });
    } catch (error) {
      const message =
        error instanceof Error && /UNIQUE|CHECK|FOREIGN KEY|NOT NULL/i.test(error.message)
          ? "The record conflicts with a unique, validation, or relationship constraint."
          : "The record could not be saved.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  },
);

import { NextResponse } from "next/server";
import { z } from "zod";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { flightCrewRepository } from "@/lib/operations/flight-crew";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  flightId: z.string().optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
const createSchema = z
  .object({
    flightId: z.string().min(1),
    crewMemberId: z.string().min(1),
    designationId: z.number().int().positive(),
  })
  .strict();

export const GET = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request) => {
    const parsed = listQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid pagination or search parameters." },
        { status: 400 },
      );
    if (parsed.data.flightId) {
      return NextResponse.json({
        rows: flightCrewRepository.manifest(parsed.data.flightId),
      });
    }
    const result = flightCrewRepository.listFlights({
      search: parsed.data.q,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
    return NextResponse.json({
      rows: result.rows,
      pagination: {
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / parsed.data.pageSize)),
      },
    });
  },
);

export const POST = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request, _context, auth) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        {
          error: "Invalid assignment details.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    try {
      flightCrewRepository.create(parsed.data, {
        id: auth.user.id,
        email: auth.user.email,
      });
      return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message === "FLIGHT_NOT_AVAILABLE")
        return NextResponse.json(
          { error: "Select an active flight." },
          { status: 400 },
        );
      if (error instanceof Error && error.message === "CREW_NOT_AVAILABLE")
        return NextResponse.json(
          { error: "Select an active crew member." },
          { status: 400 },
        );
      if (
        error instanceof Error &&
        error.message === "DESIGNATION_NOT_AVAILABLE"
      )
        return NextResponse.json(
          { error: "Select an active crew designation." },
          { status: 400 },
        );
      if (
        error instanceof Error &&
        error.message === "CREW_NOT_QUALIFIED_FOR_DESIGNATION"
      )
        return NextResponse.json(
          {
            error:
              "This crew member is not actively qualified for that designation on the flight date.",
          },
          { status: 422 },
        );
      if (
        error instanceof Error &&
        error.message.startsWith("QUALIFICATION_MISSING:")
      )
        return NextResponse.json(
          {
            error: `Assignment blocked: current ${error.message.split(":")[1]} qualification is required for this designation.`,
          },
          { status: 422 },
        );
      if (error instanceof Error && /UNIQUE/i.test(error.message))
        return NextResponse.json(
          { error: "This crew member is already assigned to that flight." },
          { status: 409 },
        );
      return NextResponse.json(
        { error: "The crew assignment could not be saved." },
        { status: 409 },
      );
    }
  },
);

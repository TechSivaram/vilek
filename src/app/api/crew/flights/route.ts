import { NextResponse } from "next/server";
import { z } from "zod";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { crewFlightsService } from "@/lib/crew/flights/service";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  search: z.string().trim().max(100).default(""),
  status: z
    .enum(["", "SCHEDULED", "BOARDING", "DEPARTED", "ARRIVAL_OVERDUE", "COMPLETED", "CANCELLED"])
    .default(""),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .default(""),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .default(""),
  sortBy: z.enum(["departure", "arrival", "flightNumber", "airline"]).default("departure"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const GET = withRouteGuard({ roles: ["CREW"] }, async (request, _context, auth) => {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid flight search parameters.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (parsed.data.fromDate && parsed.data.toDate && parsed.data.fromDate > parsed.data.toDate) {
    return NextResponse.json({ error: "From date must be on or before to date." }, { status: 400 });
  }
  return NextResponse.json(crewFlightsService.listForEmployee(auth.user.id, parsed.data));
});

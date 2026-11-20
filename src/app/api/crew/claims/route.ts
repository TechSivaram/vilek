import { NextResponse } from "next/server";
import { z } from "zod";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { crewClaimsService } from "@/lib/crew/claims/service";

export const dynamic = "force-dynamic";
const createSchema = z.object({ assignmentId: z.string().min(1) });

export const GET = withRouteGuard({ roles: ["CREW"] }, async (_request, _context, auth) => {
  return NextResponse.json(crewClaimsService.list(auth.user.id));
});

export const POST = withRouteGuard({ roles: ["CREW"] }, async (request, _context, auth) => {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Select a valid flight assignment." }, { status: 400 });
  try {
    return NextResponse.json({ claim: crewClaimsService.create(auth.user.id, parsed.data.assignmentId) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ASSIGNMENT_NOT_FOUND")
      return NextResponse.json({ error: "The selected flight assignment was not found." }, { status: 404 });
    return NextResponse.json({ error: "The claim could not be created." }, { status: 500 });
  }
});

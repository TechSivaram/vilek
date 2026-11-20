import { NextResponse } from "next/server";
import { z } from "zod";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { crewClaimsService } from "@/lib/crew/claims/service";

type Context = { params: Promise<{ claimId: string }> };
const schema = z.object({
  action: z.enum(["reject", "approve"]),
  comment: z.string().trim().min(1).max(2000),
});

export const PATCH = withRouteGuard<Context>(
  { permissions: ["CLAIM_REVIEW"] },
  async (request, context, auth) => {
    const { claimId } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Choose a review decision and enter a comment." },
        { status: 400 },
      );
    try {
      crewClaimsService.review(auth.user.id, claimId, parsed.data.action, parsed.data.comment);
      return NextResponse.json({ success: true });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "CLAIM_NOT_FOUND")
        return NextResponse.json({ error: "Claim not found." }, { status: 404 });
      if (code === "INVALID_STATUS")
        return NextResponse.json(
          { error: "Only submitted claims can be reviewed." },
          { status: 409 },
        );
      return NextResponse.json({ error: "The claim review could not be saved." }, { status: 500 });
    }
  },
);

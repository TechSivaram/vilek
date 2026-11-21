import { NextResponse } from "next/server";
import { z } from "zod";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { crewClaimsService } from "@/lib/crew/claims/service";

type Context = { params: Promise<{ claimId: string }> };
const schema = z.object({
  comment: z.string().trim().min(1).max(2000),
  parentCommentId: z.string().optional(),
});

export const GET = withRouteGuard<Context>(
  { permissions: ["CLAIM_REVIEW"] },
  async (_request, context) => {
    const { claimId } = await context.params;
    try {
      return NextResponse.json({ comments: crewClaimsService.listClaimComments(claimId) });
    } catch (error) {
      if (error instanceof Error && error.message === "CLAIM_NOT_FOUND")
        return NextResponse.json({ error: "Claim not found." }, { status: 404 });
      return NextResponse.json({ error: "Unable to load claim conversation." }, { status: 500 });
    }
  },
);

export const POST = withRouteGuard<Context>(
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
        { error: "Enter a message of up to 2,000 characters." },
        { status: 400 },
      );
    try {
      crewClaimsService.postReviewerComment(
        auth.user.id,
        claimId,
        parsed.data.comment,
        parsed.data.parentCommentId,
      );
      return NextResponse.json({ success: true });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "CLAIM_NOT_FOUND" || code === "COMMENT_NOT_FOUND")
        return NextResponse.json({ error: "Claim or parent message not found." }, { status: 404 });
      return NextResponse.json({ error: "The message could not be posted." }, { status: 400 });
    }
  },
);

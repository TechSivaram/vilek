import { NextResponse } from "next/server";
import { z } from "zod";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { hasVilekPermission } from "@/lib/auth/permissions";
import { crewClaimsService } from "@/lib/crew/claims/service";

type Context = { params: Promise<{ claimId: string }> };
const schema = z.object({
  action: z.enum(["submit", "reopen", "add-expense", "remove-expense", "reject", "approve"]),
  expenseId: z.string().optional(),
  comment: z.string().trim().max(2000).optional(),
});

export const PATCH = withRouteGuard<Context>({}, async (request, context, auth) => {
  const { claimId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid claim action." }, { status: 400 });
  try {
    if (["reject", "approve"].includes(parsed.data.action)) {
      if (!hasVilekPermission(auth.roleCodes, "CLAIM_REVIEW"))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      crewClaimsService.review(
        auth.user.id,
        claimId,
        parsed.data.action,
        parsed.data.comment ?? "",
      );
    } else {
      if (!hasVilekPermission(auth.roleCodes, "CLAIM_CREATE"))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      crewClaimsService.crewAction(
        auth.user.id,
        claimId,
        parsed.data.action,
        parsed.data.expenseId,
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      CLAIM_NOT_FOUND: "Claim not found.",
      ASSIGNMENT_NOT_FOUND: "Flight assignment not found.",
      EXPENSE_NOT_FOUND: "Expense not found for this flight assignment.",
      EXPENSE_ALREADY_CLAIMED: "This expense is already attached to a claim.",
      EMPTY_CLAIM: "Add at least one expense before submitting the claim.",
      INVALID_STATUS: "This action is not available for the claim's current status.",
      CLAIM_LOCKED: "This claim is read-only.",
      COMMENT_REQUIRED: "Enter a reason for this review decision.",
      INVALID_ACTION: "This claim action is not supported.",
    };
    const status =
      code === "CLAIM_NOT_FOUND" || code === "EXPENSE_NOT_FOUND"
        ? 404
        : code === "INVALID_STATUS" ||
            code === "CLAIM_LOCKED" ||
            code === "EMPTY_CLAIM" ||
            code === "EXPENSE_ALREADY_CLAIMED"
          ? 409
          : code === "COMMENT_REQUIRED" || code === "INVALID_ACTION"
            ? 400
            : 500;
    return NextResponse.json(
      { error: messages[code] ?? "The claim could not be updated." },
      { status },
    );
  }
});

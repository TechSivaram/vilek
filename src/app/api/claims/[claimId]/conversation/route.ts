import { NextResponse } from "next/server";
import { z } from "zod";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { hasVilekPermission } from "@/lib/auth/permissions";
import { crewClaimsService } from "@/lib/crew/claims/service";

type Context = { params: Promise<{ claimId: string }> };
export const dynamic = "force-dynamic";
const postSchema = z
  .object({
    comment: z.string().trim().min(1).max(2000),
    parentCommentId: z.string().optional(),
  })
  .strict();

type ConversationAuth = { user: { id: string }; roleCodes: string[] };

/**
 * Claim conversation access is derived only from the authenticated local
 * ViLek identity. Never accept a user ID from request data.
 *
 * APPPROVER and ADMIN are intentionally role-based, global claim access.
 * FINANCE retains its existing local FINANCE_PROCESS authorization.
 * CREW must own the requested claim.
 */
function canAccess(auth: ConversationAuth, claimId: string): boolean {
  if (auth.roleCodes.includes("ADMIN") || auth.roleCodes.includes("APPROVER")) {
    return true;
  }

  if (hasVilekPermission(auth.roleCodes, "FINANCE_PROCESS")) {
    return true;
  }

  if (auth.roleCodes.includes("CREW") && hasVilekPermission(auth.roleCodes, "CLAIM_READ")) {
    return crewClaimsService.userOwnsClaim(claimId, auth.user.id);
  }

  // No conversation access is granted to other roles unless an existing,
  // explicit resource authorization rule is added for that role.
  return false;
}

const IDENTITY_QUERY_KEYS = ["userId", "user_id", "ownerId", "owner_id", "createdBy", "created_by"];

export const GET = withRouteGuard<Context>({}, async (request, context, auth) => {
  const { claimId } = await context.params;
  if (!canAccess(auth, claimId))
    return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  const params = new URL(request.url).searchParams;
  if (IDENTITY_QUERY_KEYS.some((key) => params.has(key))) {
    return NextResponse.json(
      { error: "User identity must come from the authenticated session." },
      { status: 400 },
    );
  }
  const limit = Number(params.get("limit") ?? 100);
  const before = params.get("before") ?? undefined;
  return NextResponse.json(crewClaimsService.getConversation(claimId, limit, before));
});

export const POST = withRouteGuard<Context>({}, async (request, context, auth) => {
  const { claimId } = await context.params;
  if (!canAccess(auth, claimId))
    return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter a message of up to 2,000 characters." },
      { status: 400 },
    );
  try {
    const message = crewClaimsService.postConversationMessage(
      auth.user.id,
      claimId,
      parsed.data.comment,
      parsed.data.parentCommentId,
    );
    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "CLAIM_NOT_FOUND" || code === "COMMENT_NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      {
        error:
          code === "COMMENT_NOT_FOUND"
            ? "The reply target was not found."
            : "The message could not be posted.",
      },
      { status },
    );
  }
});

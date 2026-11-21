import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { crewClaimsService } from "@/lib/crew/claims/service";

export const dynamic = "force-dynamic";

export const GET = withRouteGuard({ permissions: ["CLAIM_REVIEW"] }, async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const result = crewClaimsService.reviewQueuePage({
    page: Number(params.get("page") ?? 1),
    pageSize: Number(params.get("pageSize") ?? 25),
    search: params.get("search") ?? "",
    sortBy: params.get("sortBy") ?? "submitted",
    sortOrder: params.get("sortOrder") === "asc" ? "asc" : "desc",
  });
  return NextResponse.json(result);
});

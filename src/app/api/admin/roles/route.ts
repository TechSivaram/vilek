import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import {
  listQuerySchema,
  createInputSchema,
} from "@/lib/admin/features/roles/schema";
import { rolesService } from "@/lib/admin/features/roles/service";
export const dynamic = "force-dynamic";
export const GET = withRouteGuard(
  { roles: ["ADMIN"] },
  async (request: Request) => {
    const parsed = listQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      return NextResponse.json(
        {
          error: "Invalid pagination or search parameters.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    const result = await rolesService.list({
      search: parsed.data.q,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      sort: parsed.data.sort,
      direction: parsed.data.direction,
    });
    return NextResponse.json({
      rows: result.rows,
      options: {},
      pagination: {
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / parsed.data.pageSize)),
      },
    });
  },
);

export const POST = withRouteGuard({ roles: ["ADMIN"] }, async () =>
  NextResponse.json(
    { error: "Creating roles is not supported." },
    { status: 405 },
  ),
);

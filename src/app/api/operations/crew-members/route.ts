import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import {
  listQuerySchema,
  createInputSchema,
} from "@/lib/admin/features/crew_members/schema";
import { crew_membersService } from "@/lib/admin/features/crew_members/service";
export const dynamic = "force-dynamic";
export const GET = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
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
    const result = await crew_membersService.list({
      search: parsed.data.q,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      sort: parsed.data.sort,
      direction: parsed.data.direction,
    });
    return NextResponse.json({
      rows: result.rows,
      options: crew_membersService.options(),
      pagination: {
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / parsed.data.pageSize)),
      },
    });
  },
);

import { resourceConfigs } from "@/lib/admin/resources";
export const POST = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request) => {
    const config = resourceConfigs["crew-members"];
    if (!config?.canCreate || config.listOnly)
      return NextResponse.json(
        { error: "Create is not available for this resource." },
        { status: 405 },
      );
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = createInputSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    try {
      await crew_membersService.create(parsed.data);
      return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
      const message =
        error instanceof Error &&
        /UNIQUE|CHECK|FOREIGN KEY|NOT NULL/i.test(error.message)
          ? "The record violates a uniqueness, validation, or relationship constraint."
          : "The record could not be saved.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  },
);

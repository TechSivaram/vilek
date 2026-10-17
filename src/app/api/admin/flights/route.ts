import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import {
  listQuerySchema,
  formSchema,
} from "@/lib/admin/features/flights/schema";
import { flightsService } from "@/lib/admin/features/flights/service";
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
    const result = await flightsService.list({
      search: parsed.data.q,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      sort: parsed.data.sort,
      direction: parsed.data.direction,
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
  { roles: ["ADMIN"] },
  async (request: Request) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = formSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid flight form data.", details: parsed.error.flatten() },
        { status: 400 },
      );
    try {
      await flightsService.create(parsed.data);
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

import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { fileTypesService } from "@/lib/admin/features/file_types/service";
type Ctx = { params: Promise<{ id: string }> };
export const DELETE = withRouteGuard(
  { roles: ["ADMIN"] },
  async (_request: Request, context: Ctx) => {
    const { id } = await context.params;
    const n = Number(id);
    if (!Number.isSafeInteger(n) || n < 1)
      return NextResponse.json(
        { error: "Invalid file type ID." },
        { status: 400 },
      );
    const result = fileTypesService.remove(n);
    return result.changes
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "File type not found." }, { status: 404 });
  },
);

import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { fileTypesService } from "@/lib/admin/features/file_types/service";
import { createFileTypeSchema } from "@/lib/admin/features/file_types/schema";
export const dynamic = "force-dynamic";
export const GET = withRouteGuard({ roles: ["ADMIN"] }, async () => {
  const setting = fileTypesService.setting();
  if (!setting)
    return NextResponse.json({
      settingId: null,
      rows: [],
      notice: "Configure system settings before adding allowed file types.",
    });
  return NextResponse.json({
    settingId: setting.id,
    rows: fileTypesService.list(setting.id),
  });
});
export const POST = withRouteGuard({ roles: ["ADMIN"] }, async (request) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createFileTypeSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Enter an extension such as .pdf or .jpg.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  const fileType = parsed.data.fileType;
  const setting = fileTypesService.setting();
  if (!setting)
    return NextResponse.json(
      { error: "Save system settings before configuring allowed file types." },
      { status: 409 },
    );
  try {
    fileTypesService.create(setting.id, fileType);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "This file type is already allowed or could not be saved." },
      { status: 409 },
    );
  }
});
